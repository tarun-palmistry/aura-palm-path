-- Extensions
create extension if not exists pgcrypto;

-- Role enum (kept in separate table to prevent privilege escalation)
create type public.app_role as enum ('admin', 'user');

-- Domain enums
create type public.hand_side as enum ('left', 'right');
create type public.payment_status as enum ('pending', 'successful', 'failed');

-- Profiles (requested user profile data)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  age int,
  gender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Separate roles table (critical security requirement)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

-- Core feature tables
create table if not exists public.palm_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hand_side public.hand_side not null,
  dominant_hand public.hand_side not null,
  age int,
  gender text,
  analysis_status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid not null references public.palm_readings(id) on delete cascade,
  storage_path text not null,
  public_url text,
  source text not null check (source in ('upload', 'camera')),
  created_at timestamptz not null default now()
);

create table if not exists public.palm_features (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null unique references public.palm_readings(id) on delete cascade,
  palm_shape text,
  life_line_clarity text,
  heart_line text,
  head_line text,
  major_mounts jsonb,
  extracted_features jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null unique references public.palm_readings(id) on delete cascade,
  free_preview text not null,
  full_report text not null,
  is_unlocked boolean not null default false,
  generated_from_features jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid not null references public.palm_readings(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text,
  provider_payment_id text,
  provider_signature text,
  amount_inr numeric(10,2) not null,
  currency text not null default 'INR',
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Useful indexes
create index if not exists idx_palm_readings_user_id on public.palm_readings(user_id);
create index if not exists idx_images_user_id on public.images(user_id);
create index if not exists idx_images_reading_id on public.images(reading_id);
create index if not exists idx_reports_reading_id on public.reports(reading_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_reading_id on public.payments(reading_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);

-- Timestamp helper
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role helper (security definer avoids recursive RLS issues)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- Admin helper
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin'::public.app_role);
$$;

-- Auto-create profile and default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user'::public.app_role)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep timestamps updated
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_palm_readings_updated_at on public.palm_readings;
create trigger trg_palm_readings_updated_at
before update on public.palm_readings
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_palm_features_updated_at on public.palm_features;
create trigger trg_palm_features_updated_at
before update on public.palm_features
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at
before update on public.reports
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.palm_readings enable row level security;
alter table public.images enable row level security;
alter table public.palm_features enable row level security;
alter table public.reports enable row level security;
alter table public.payments enable row level security;

-- Profiles policies
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id or public.is_admin(auth.uid()));

-- Roles policies
create policy "Admins can manage roles"
on public.user_roles
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Users can read own roles"
on public.user_roles
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Readings policies
create policy "Users can read own readings"
on public.palm_readings
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can create own readings"
on public.palm_readings
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can update own readings"
on public.palm_readings
for update
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can delete own readings"
on public.palm_readings
for delete
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Images policies
create policy "Users can read own images"
on public.images
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can create own images"
on public.images
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can delete own images"
on public.images
for delete
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Features policies
create policy "Users can read own features"
on public.palm_features
for select
using (
  exists (
    select 1 from public.palm_readings pr
    where pr.id = palm_features.reading_id
      and (pr.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

create policy "System/admin can manage features"
on public.palm_features
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Reports policies (preview and full report live in one row; UI controls 20% reveal)
create policy "Users can read own reports"
on public.reports
for select
using (
  exists (
    select 1 from public.palm_readings pr
    where pr.id = reports.reading_id
      and (pr.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

create policy "System/admin can manage reports"
on public.reports
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Payments policies
create policy "Users can read own payments"
on public.payments
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can create own payments"
on public.payments
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Admins can update payments"
on public.payments
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Private storage bucket for palm images
insert into storage.buckets (id, name, public)
values ('palm-images', 'palm-images', false)
on conflict (id) do nothing;

create policy "Users can upload own palm images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'palm-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view own palm images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'palm-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own palm images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'palm-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Secure admin view for panel
create or replace view public.admin_reading_overview as
select
  pr.id as reading_id,
  pr.user_id,
  pr.hand_side,
  pr.dominant_hand,
  pr.analysis_status,
  pr.created_at as submitted_at,
  r.id as report_id,
  r.is_unlocked,
  p.status as payment_status,
  p.amount_inr,
  p.provider_payment_id
from public.palm_readings pr
left join public.reports r on r.reading_id = pr.id
left join lateral (
  select p2.*
  from public.payments p2
  where p2.reading_id = pr.id
  order by p2.created_at desc
  limit 1
) p on true;