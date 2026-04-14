# AstraPalm — Production Technical Documentation

## SECTION 1: PROJECT OVERVIEW

### Project name
**AstraPalm**

### Core purpose
AstraPalm is a multilingual (English/Hindi) spiritual guidance platform that combines:
- AI-assisted **palmistry analysis** from user-uploaded/captured hand images
- AI-generated **birth-chart-based horoscope reports**
- AI-generated **daily horoscope snapshots**
- **Paid unlocks** for premium report content using Razorpay
- Built-in **trust/compliance** pages and admin analytics/report controls

### Key features
| Feature | Status | Technical Implementation |
|---|---|---|
| Palmistry report generation | Implemented | `PalmScanner` + `analyze-palm` backend function + `reports/palm_features` tables |
| Horoscope report generation | Implemented | `/astrology` form + `generate-astrology-report` backend function + `horoscope_requests` |
| Daily horoscope | Implemented | `/astrology#daily` + `generate-daily-horoscope` function + `daily_horoscopes` |
| Report PDF export | Implemented | `src/lib/pdf.ts` using `jspdf` |
| Payment unlocks | Implemented | Razorpay checkout + `create-razorpay-order` + `verify-razorpay-payment` |
| Analytics tracking | Implemented | `src/lib/analytics.ts` + `analytics_events` table |
| Admin panel | Implemented | `/admin` route + `AdminPanel.tsx` with analytics/payments/report editing |
| WhatsApp updates | Partially implemented | CTA + event tracking only (no persistent subscription table/API in current codebase) |
| Legal/trust pages | Implemented | `/privacy`, `/terms`, `/contact`, `/guidance-disclaimer` |

### Target users
- End users seeking reflective spiritual guidance (palmistry + astrology)
- Indian market users for INR payments via Razorpay
- English/Hindi audience
- Internal/admin users managing report quality and analytics

### Overall architecture summary
- **Frontend:** React + Vite SPA with route-based pages and modular feature components
- **Backend:** Supabase Edge Functions (Deno-based serverless handlers)
- **Data layer:** PostgreSQL (Supabase) with Row Level Security policies
- **Auth:** Email/password auth + session persistence
- **Storage:** Private bucket for palm images
- **AI:** OpenAI-compatible chat HTTP API (`google/gemini-3-flash-preview` or equivalent) for structured extraction + interpretation text generation

---

## SECTION 2: TECH STACK (DETAILED)

### Frontend
| Layer | Technology | Details |
|---|---|---|
| Framework | React 18 + TypeScript | SPA rendered from `src/main.tsx` |
| Build tool | Vite 5 | Dev/build via `vite` scripts |
| Styling | Tailwind CSS + CSS variables | Dark premium theme; HSL semantic tokens in `src/index.css` + `tailwind.config.ts` |
| UI system | shadcn/Radix-based components | Buttons, inputs, sheets, accordions, toasts, etc. in `src/components/ui/*` |
| Routing | `react-router-dom` v6 | Routes declared in `src/App.tsx` |
| State management | React hooks + local component state | No Redux/MobX; state colocated per feature |
| Server-state utility | `@tanstack/react-query` | Provider configured globally (minimal direct use in app logic currently) |
| Form validation | `zod` | Client-side validation in Palm/Astrology forms |
| Notifications | `sonner` + shadcn toasts | Success/error feedback throughout flows |
| PDF generation | `jspdf` | Local report export generation |

### Backend
| Layer | Technology | Details |
|---|---|---|
| Runtime | Deno serverless functions | One function per domain operation |
| Function style | HTTP JSON handlers | `Deno.serve()` with CORS + auth checks |
| Validation | `zod` (selected functions) | Strong payload validation on astrology/payment functions |
| Auth verification | Token-based user validation | Function receives bearer token, validates user before DB changes |

### Database
| Item | Technology |
|---|---|
| Engine | PostgreSQL (Supabase managed) |
| Client/query layer | `@supabase/supabase-js` in frontend + backend functions |
| Access control | Row Level Security (RLS) + role helper functions (`has_role`, `is_admin`) |

### Storage
| Item | Technology | Details |
|---|---|---|
| Palm image storage | Supabase Storage bucket `palm-images` | Private bucket; user-scoped folder policy |

### Integrations
| Integration | Usage |
|---|---|
| Razorpay | Order creation, checkout popup, signature verification, unlock propagation |
| WhatsApp | UI CTA only (deep-link/navigation intent), no direct messaging API in current code |
| Internal analytics | Event logging table `analytics_events` + admin reporting UI |

### AI
| Item | Details |
|---|---|
| Provider gateway | Configured via `OPENAI_COMPAT_API_URL` (OpenAI-compatible `/v1/chat/completions` endpoint) |
| Model | `google/gemini-3-flash-preview` |
| Modalities | Text + image (for palm extraction) |
| Purposes | Palm feature extraction, palm report composition, astrology structuring, astrology interpretation, daily horoscope generation |

### Environment

#### Frontend env variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID` (available in environment, used for project context)

#### Backend function secrets
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY` (fallback to `SUPABASE_ANON_KEY` in code)
- `OPENAI_COMPAT_API_URL` (full URL to chat completions endpoint)
- `OPENAI_COMPAT_API_KEY` (bearer token for that endpoint)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

---

## SECTION 3: APPLICATION ARCHITECTURE

### High-level system architecture
```text
Browser (React SPA)
  ├─ Auth/session (supabase-js client)
  ├─ UI + local state + validation
  ├─ Calls backend functions (HTTP invoke)
  └─ Reads/writes DB + storage via scoped client

Supabase Edge Functions (Deno)
  ├─ Auth token verification
  ├─ Input validation
  ├─ AI gateway orchestration
  ├─ Payment provider interaction (Razorpay)
  └─ Privileged DB/storage operations

Database + Storage
  ├─ PostgreSQL tables (reports, payments, analytics, etc.)
  ├─ RLS policies + role helpers
  └─ Private palm image bucket
```

### Frontend-to-backend interaction flow
1. Client captures user action and validates input.
2. Client invokes backend function via `supabase.functions.invoke(functionName, { body })`.
3. Function validates bearer token + payload.
4. Function performs domain logic (AI call/payment operation/DB updates).
5. Function returns JSON payload; client updates state/UI.

### API communication structure
- Transport: HTTPS JSON
- Invocation pattern: **RPC-like function endpoint naming**
- Auth: Bearer JWT in `Authorization` header automatically from client session
- CORS: `Access-Control-Allow-Origin: *` in all backend functions

### Data flow diagram explanation (textual)

#### Palmistry
`UI form -> palm_readings row -> storage upload -> images row -> analyze-palm function -> AI extraction -> AI interpretation -> palm_features upsert -> reports upsert -> UI fetch/poll -> unlock gate`

#### Horoscope
`UI birth form -> generate-astrology-report function -> AI structuring -> AI interpretation -> horoscope_requests insert -> UI render -> unlock gate`

#### Daily Horoscope
`UI zodiac select -> generate-daily-horoscope function -> AI generation -> daily_horoscopes upsert -> UI display + history`

#### Payments
`UI plan select -> create-razorpay-order -> Razorpay checkout -> verify-razorpay-payment -> payments update -> report_unlocks upsert -> report/horoscope unlock flags`

---

## SECTION 4: PAGE-WISE BREAKDOWN

### 1) Homepage
- **Route:** `/`
- **Purpose:** Marketing + conversion + authentication + palm scanner + palm report viewing
- **Core components:**
  - `MarketingHomepage`
  - `AuthPanel`
  - `PalmScanner`
  - `ReportViewer`
- **Data required:**
  - Session state (`supabase.auth.getSession`, `onAuthStateChange`)
  - Latest palm reading/report by `user_id`
  - Unlock state from `report_unlocks`
- **API/backend calls:**
  - Auth session calls
  - DB reads: `palm_readings`, `reports`, `user_roles`
  - Indirect through scanner/payment hooks
- **User actions:** Start reading, sign in/up/out, upload/capture palm, submit for analysis, unlock paid report, download PDF, navigate to other sections/pages

### 2) Palmistry page
- **Route:** Not a standalone route; implemented as a major section inside `/`
- **Purpose:** End-to-end palm input + report generation
- **Core component:** `PalmScanner`
- **Data required:** Dominant hand, optional age/gender, image file
- **API calls:** `analyze-palm` function + DB/storage writes
- **Actions:** Select hand, choose image source, upload/capture, submit

### 3) Horoscope page
- **Route:** `/astrology`
- **Purpose:** Generate and view astrology birth chart report
- **Core components:** Auth panel, report cards, unlock card
- **Data required:** name, DOB, TOB, place, optional gender, language
- **API calls:** `generate-astrology-report`, payment functions, history DB reads
- **Actions:** submit chart, unlock full report, download PDF, open saved reports

### 4) Daily Horoscope page/section
- **Route:** `/astrology#daily` (section)
- **Purpose:** On-demand daily zodiac guidance
- **Data required:** selected zodiac sign (fallback to latest chart in backend if omitted)
- **API calls:** `generate-daily-horoscope`
- **Actions:** request today’s guidance; view daily history

### 5) Report pages (Palmistry + Horoscope)
- **Palm report route context:** `/` after palm submission (`ReportViewer`)
- **Horoscope report route context:** `/astrology` latest report card
- **Purpose:** show free preview + gated premium sections
- **API calls:** none directly in viewer, but depends on upstream generated data and unlock states
- **Actions:** unlock, download PDF, browse sections

### 6) Payment / Unlock flow
- **Route context:** `/` and `/astrology`
- **Components:** `UnlockPlansCard`, `useRazorpayPayment`
- **Actions:** choose plan, open checkout, verify payment, unlock premium content

### 7) My Readings dashboard
- **Route:** no dedicated `/readings` route currently
- **Implemented equivalent:**
  - Latest palm report restoration in `Index.tsx`
  - Saved horoscope/daily history list in `/astrology`

### 8) WhatsApp subscription flow
- **Route context:** Homepage section `#daily-whatsapp`
- **Current behavior:** CTA navigates user to `/astrology#daily`, logs analytics event
- **Missing currently:** No backend WhatsApp subscription API/table/provider sync in current code

### 9) Authentication pages
- **Route:** Embedded panels inside `/` and `/astrology` (not standalone route pages)
- **Component:** `AuthPanel`
- **Actions:** sign up, sign in, sign out
- **API calls:** `supabase.auth.signUp`, `signInWithPassword`, `signOut`

### 10) Blog / SEO pages
- **Route:** static sections inside homepage (`#blog`, SEO summary section)
- **Data source:** Locale JSON content
- **Current state:** presentation content only, no CMS/blog engine or dedicated post routes

### 11) Legal pages
- **Routes:**
  - `/privacy`
  - `/terms`
  - `/contact`
  - `/guidance-disclaimer`
- **Shared layout:** `TrustPageLayout`
- **Purpose:** compliance, legal clarity, support contact

### 12) Admin page
- **Route:** `/admin`
- **Purpose:** operational visibility + report edits + analytics/payment metrics
- **Components:** `AdminPanel`
- **Data:** `admin_reading_overview`, `reports`, `analytics_events`, `payments`
- **Actions:** search/filter, edit report text, inspect event/payment funnels

---

## SECTION 5: FEATURE-WISE FUNCTIONALITY

### Palmistry

#### Image upload/capture flow
1. User opens source picker (`Add Palm Image`) and selects:
   - Camera capture (`navigator.mediaDevices.getUserMedia`)
   - File upload (`input[type=file]`)
2. App validates MIME + size (`<=12MB`, jpg/png/webp)
3. App submits metadata + image pathing data

#### Metadata capture
- Dominant hand (left/right)
- Optional age, optional gender
- Current implementation maps `hand_side = dominant_hand`

#### AI processing
- Function: `analyze-palm`
- Two-stage generation:
  1. **Vision extraction** from signed image URL (strict JSON)
  2. **Interpretation generation** from extracted features only

#### Report generation logic
- Function composes canonical sections:
  - Personality Overview
  - Love & Relationships
  - Career & Strengths
  - Future Guidance
  - Key Advice
- `free_preview` = first ~20% with minimum threshold
- Persisted in `reports`, features persisted in `palm_features`

### Horoscope

#### Input fields
- Full name
- Date of birth
- Time of birth
- Place of birth
- Optional gender

#### Data processing
- Client validates via zod
- Backend calculates fallback sun sign from DOB (`getSunSignFromDate`)

#### API usage
- `generate-astrology-report` function
- Two-step AI chain:
  1. Structured astrology data JSON
  2. Human-readable interpretation JSON

#### Report generation
- Structured `interpretation` JSON + concatenated `full_report`
- `free_summary` (~20%) for locked state

### Daily Horoscope

#### Data source
- AI generation per zodiac + date
- User identity-scoped persistence in `daily_horoscopes`

#### Fetch mechanism
- `generate-daily-horoscope` function
- Upsert by `(user_id, zodiac_sign, horoscope_date)`

#### Display logic
- Latest result card + historical entries in `/astrology`

### Payments

#### Razorpay order creation
- Function: `create-razorpay-order`
- Validates ownership of target reading/report
- Creates Razorpay order + pending `payments` record

#### Checkout flow
- Frontend loads script dynamically (`loadRazorpayScript`)
- Opens Razorpay modal
- Handles dismiss/failure/success callbacks

#### Payment verification
- Function: `verify-razorpay-payment`
- Recomputes HMAC signature (`orderId|paymentId`) with `RAZORPAY_KEY_SECRET`
- Marks payment `successful` or `failed`

#### Unlock logic
- Upsert into `report_unlocks`
- Updates `reports.is_unlocked` (palm) and/or `horoscope_requests.is_unlocked` (horoscope)

### Language System

#### Translation architecture
- Locale files: `src/locales/en.json`, `src/locales/hi.json`
- Context provider: `LanguageProvider`
- Access helpers:
  - `t(key)` for strings
  - `tm<T>(key)` for typed nested arrays/objects

#### Toggle + persistence
- `LanguageSwitcher` toggles EN/HI
- Stored in localStorage key: `app-language`

#### Runtime safety
- `useLanguage` now returns an English fallback context (with warning) if called outside provider, preventing hard crash

### Loader System

#### Loader types
- `fullPage`, `section`, `button`, `inline`

#### Usage areas
- Session bootstrap, admin auth check, report generation stages, payment processing

#### Animation logic
- Core pulse + multi-orbit planet animation
- Reduced motion support via media query

---

## SECTION 6: API DESIGN

> Note: Backend functions are invoked from frontend via `supabase.functions.invoke("function-name", { body })`, mapping to function endpoints under `/functions/v1/{function-name}`.

### 1) Palmistry processing API
| Item | Value |
|---|---|
| Endpoint | `/functions/v1/analyze-palm` |
| Method | POST |
| Purpose | Analyze palm image and generate structured palmistry report |
| Auth | Required bearer token |

**Request payload**
```json
{
  "readingId": "uuid",
  "language": "en|hi"
}
```

**Success response**
```json
{ "success": true, "readingId": "uuid" }
```

**Validation/guardrails**
- Requires `readingId`
- Ensures reading belongs to authenticated user
- Requires associated image record
- Rejects poor quality/non-palm detection from AI extraction

### 2) Horoscope API
| Item | Value |
|---|---|
| Endpoint | `/functions/v1/generate-astrology-report` |
| Method | POST |
| Purpose | Generate structured and narrative horoscope report |
| Auth | Required |

**Request payload**
```json
{
  "fullName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "timeOfBirth": "HH:mm",
  "placeOfBirth": "string",
  "gender": "string?",
  "language": "en|hi"
}
```

**Response**
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "zodiac_sign": "...",
    "moon_sign": "...",
    "rising_sign": "...",
    "free_summary": "...",
    "full_report": "...",
    "interpretation": {}
  }
}
```

### 3) Daily Horoscope API
| Item | Value |
|---|---|
| Endpoint | `/functions/v1/generate-daily-horoscope` |
| Method | POST |
| Purpose | Generate daily horoscope record for user/sign/day |
| Auth | Required |

**Request payload**
```json
{
  "zodiacSign": "Aries",
  "language": "en|hi"
}
```

**Response**
```json
{
  "success": true,
  "horoscope": {
    "id": "uuid",
    "zodiac_sign": "Aries",
    "today_prediction": "...",
    "lucky_number": "...",
    "lucky_color": "...",
    "advice": "..."
  }
}
```

### 4) Payment order API
| Item | Value |
|---|---|
| Endpoint | `/functions/v1/create-razorpay-order` |
| Method | POST |
| Purpose | Create Razorpay order and pending payment record |
| Auth | Required |

**Request payload**
```json
{
  "planType": "palmistry|horoscope|combo",
  "readingId": "uuid?",
  "horoscopeRequestId": "uuid?"
}
```

**Response payload**
```json
{
  "keyId": "rzp_key",
  "orderId": "order_xxx",
  "amount": 9900,
  "currency": "INR",
  "planType": "palmistry",
  "planLabel": "Palmistry Full Report"
}
```

### 5) Payment verification API
| Item | Value |
|---|---|
| Endpoint | `/functions/v1/verify-razorpay-payment` |
| Method | POST |
| Purpose | Verify Razorpay signature and unlock relevant content |
| Auth | Required |

**Request payload**
```json
{
  "planType": "palmistry|horoscope|combo",
  "readingId": "uuid?",
  "horoscopeRequestId": "uuid?",
  "orderId": "order_xxx",
  "paymentId": "pay_xxx",
  "signature": "hex_signature"
}
```

**Response payload**
```json
{
  "success": true,
  "unlocks": {
    "palmistry": true,
    "horoscope": false,
    "combo": false
  }
}
```

### 6) WhatsApp subscription API
- **Current status:** Not implemented as backend API in this codebase
- Existing implementation is UI CTA + analytics event (`whatsapp_signup_click`)

### 7) Auth APIs
- `supabase.auth.signUp({ email, password, options.emailRedirectTo })`
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.signOut()`
- `supabase.auth.getSession()`
- `supabase.auth.onAuthStateChange()`

---

## SECTION 7: DATA MODELS / DATABASE STRUCTURE

## Core tables

### `profiles`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | user id |
| full_name | text | nullable |
| avatar_url | text | nullable |
| age | int | nullable |
| gender | text | nullable |
| created_at / updated_at | timestamptz | managed |

### `user_roles`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK |
| user_id | uuid | unique with role |
| role | enum `app_role` (`admin`,`user`) |
| created_at | timestamptz |

### `palm_readings`
| Field | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| hand_side | enum `hand_side` |
| dominant_hand | enum `hand_side` |
| age | int nullable |
| gender | text nullable |
| analysis_status | text |
| created_at / updated_at | timestamptz |

### `images`
| Field | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| reading_id | uuid FK -> `palm_readings.id` |
| storage_path | text |
| public_url | text nullable |
| source | text (`upload`/`camera`) |
| created_at | timestamptz |

### `palm_features`
| Field | Type |
|---|---|
| id | uuid PK |
| reading_id | uuid unique FK |
| palm_shape, life_line_clarity, heart_line, head_line | text nullable |
| major_mounts | jsonb nullable |
| extracted_features | jsonb |
| created_at / updated_at | timestamptz |

### `reports`
| Field | Type |
|---|---|
| id | uuid PK |
| reading_id | uuid unique FK |
| free_preview | text |
| full_report | text |
| is_unlocked | boolean |
| generated_from_features | jsonb |
| created_at / updated_at | timestamptz |

### `horoscope_requests`
| Field | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| full_name | text |
| date_of_birth | date |
| time_of_birth | time |
| place_of_birth | text |
| gender | text nullable |
| zodiac_sign / moon_sign / rising_sign | text |
| planetary_positions | jsonb |
| astrology_data | jsonb |
| interpretation | jsonb |
| free_summary | text |
| full_report | text |
| is_unlocked | boolean |
| created_at / updated_at | timestamptz |

### `daily_horoscopes`
| Field | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| zodiac_sign | text |
| horoscope_date | date |
| today_prediction | text |
| lucky_number | text |
| lucky_color | text |
| advice | text |
| raw_data | jsonb |
| created_at / updated_at | timestamptz |

### `payments`
| Field | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| reading_id | uuid nullable |
| horoscope_request_id | uuid nullable |
| plan_type | enum `report_type` |
| provider | text |
| provider_order_id / provider_payment_id / provider_signature | text nullable |
| amount_inr | numeric |
| currency | text |
| status | enum `payment_status` |
| paid_at | timestamptz nullable |
| raw_response | jsonb |
| failure_reason | text nullable |
| created_at / updated_at | timestamptz |

### `report_unlocks`
| Field | Type |
|---|---|
| id | uuid PK |
| user_id | uuid unique |
| palmistry_unlocked | boolean |
| horoscope_unlocked | boolean |
| unlocked_via_combo | boolean |
| last_payment_id | uuid nullable FK payments |
| created_at / updated_at | timestamptz |

### `analytics_events`
| Field | Type |
|---|---|
| id | uuid PK |
| created_at | timestamptz |
| user_id | uuid nullable |
| event_name | enum `analytics_event_name` |
| page_path | text nullable |
| metadata | jsonb |

### Views
#### `admin_reading_overview`
Joins latest payment + report status per palm reading for admin operations.

### Relationships (key)
- `palm_readings (1) -> (N) images`
- `palm_readings (1) -> (1) reports`
- `palm_readings (1) -> (1) palm_features`
- `payments` may target palm reading or horoscope request depending on plan
- `report_unlocks` is user-level aggregate unlock state

### WhatsApp subscriptions table
- **Not present** in current schema

---

## SECTION 8: DATA FLOW

### Palmistry flow (step-by-step)
1. User signs in.
2. User selects dominant hand and uploads/captures palm image.
3. Frontend creates `palm_readings` row (`analysis_status = processing`).
4. Image uploaded to private storage path `{userId}/{readingId}-{timestamp}.ext`.
5. `images` row inserted with source metadata.
6. Frontend invokes `analyze-palm`.
7. Function:
   - validates ownership and gets signed image URL
   - runs AI extraction JSON
   - runs AI report-generation JSON
   - upserts `palm_features` and `reports`
   - marks `palm_readings.analysis_status = completed`
8. Frontend polls `reports` table until available.
9. User sees free preview; premium sections gated.
10. On payment verification success, unlock fields and report flags are updated.

### Horoscope flow (step-by-step)
1. User signs in and enters birth details.
2. Client validates with zod.
3. Frontend invokes `generate-astrology-report`.
4. Function computes/derives sign context and calls AI for structured chart + interpretation.
5. Function inserts full row into `horoscope_requests` with free summary + full report.
6. UI displays summary and chart cards; full sections gated unless unlocked.
7. Unlock state can be elevated by plan purchase.

### Payment flow (step-by-step)
1. User chooses plan in `UnlockPlansCard`.
2. Frontend invokes `create-razorpay-order`.
3. Backend validates ownership and creates Razorpay order + pending payment row.
4. Frontend opens Razorpay modal.
5. On success callback, frontend sends payment IDs/signature to `verify-razorpay-payment`.
6. Backend verifies HMAC signature.
7. Backend updates payment status and upserts `report_unlocks`.
8. Backend marks target report/request unlocked.
9. Frontend refreshes unlock state and updates UI.

---

## SECTION 9: AI IMPLEMENTATION DETAILS

### Inputs sent to AI

#### Palm extraction prompt input
- Signed palm image URL
- System instruction requiring strict JSON keys:
  - `is_palm_detected`
  - `image_quality`
  - `palm_shape`, `life_line_clarity`, `heart_line`, `head_line`
  - `major_mounts`, `confidence`, `notes`

#### Palm interpretation prompt input
- Structured extraction JSON only (no raw image)
- Output schema strictly constrained to section keys

#### Astrology prompt input
- Personal birth details + computed sun sign context
- Stage 1: strict structural JSON (zodiac/moon/rising/planetary map)
- Stage 2: strict interpretation JSON (personality/love/career/etc.)

#### Daily horoscope prompt input
- Zodiac sign + current date
- Output strict JSON with prediction/lucky fields

### Prompt structure pattern
All AI calls follow a **System + User** pattern:
1. **System message** defines strict schema and hard output constraints.
2. **User message** passes only required context payload.
3. Output is parsed as JSON after markdown fence cleanup.

### Structured data generation
- Parsing helper strips ```json fences and runs `JSON.parse`.
- Parsed object fields are then normalized/mapped before persistence.

### Final report text generation
- Built by deterministic section heading template.
- Headings are language-aware (EN/HI).
- Free preview slices first ~20% with minimum threshold.

### Hallucination minimization strategy
- “Use ONLY provided data” instruction in interpretation prompts.
- Schema-constrained JSON-only output requests.
- Low temperature for structure generation (`0.2`) and moderate for interpretation (`0.5`/`0.6`).

### Consistency controls
- Canonical section ordering enforced in code.
- Static enum + schema validations before DB writes.
- Post-processing fallback mapping for alternate key names.

---

## SECTION 10: SECURITY

### Payment security
- Razorpay signature verified server-side using HMAC SHA-256.
- Mismatch handling marks payment as failed and stores verification metadata.
- Plan/resource ownership checks before unlock mutation.

### API validation
- zod payload validation used on astrology and payment functions.
- Required-auth checks on all backend functions.

### Input sanitization
- Form-level zod validation on frontend for palm and astrology metadata.
- File type and file-size checks before upload.

### User data protection
- RLS enabled across domain tables.
- Role model isolated in `user_roles` table (not in profile).
- Private storage bucket path-scoped by authenticated user id.

### Admin protection
- Admin role checks via `is_admin()` SQL function and route guard.
- Admin-only read policy for analytics events.

### Rate limiting
- No explicit custom rate limiting layer implemented in current function code.

---

## SECTION 11: PERFORMANCE

### Loader strategy
- Stage-specific loading states improve perceived performance:
  - Uploading
  - Extracting
  - Finalizing
- Consistent cosmic loader variants across full page, section, button, inline contexts.

### Lazy loading
- Image preview uses `loading="lazy"`.
- Bundle-level code splitting is not heavily applied yet (large chunk warnings currently present in builds).

### API optimization
- Batched admin loading with `Promise.all`.
- Data limits applied on analytics/payments queries in admin (`limit(500)`).
- Polling for palm reports with bounded retries (18 attempts x 1.4s).

### Mobile optimization
- Responsive section grids (`md`, `lg`, `xl` breakpoints).
- Mobile sheet navigation and fixed language switcher.
- Camera capture supports `facingMode: "environment"` for hand scanning.

---

## SECTION 12: DEPLOYMENT AND ENVIRONMENT

### Environment setup
1. Install dependencies: `npm install`
2. Configure environment (frontend + backend secrets)
3. Run locally: `npm run dev`
4. Build: `npm run build`

### Required environment variables

#### Frontend
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

#### Backend functions
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY` fallback)
- `OPENAI_COMPAT_API_URL`
- `OPENAI_COMPAT_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

### Build process
- Command: `npm run build`
- Toolchain: Vite + SWC + TypeScript
- Output folder: `dist/`

### Deployment notes
- Frontend is static SPA deployment.
- Backend functions deploy independently as serverless functions.
- DB migrations define schema, RLS, indexes, and helper SQL functions.

---

## SECTION 13: FUTURE IMPROVEMENTS

### Suggested enhancements
1. Implement dedicated WhatsApp subscription backend:
   - table: `whatsapp_subscriptions`
   - provider integration + consent tracking + opt-out
2. Create dedicated **My Readings** route aggregating palm + horoscope + daily history.
3. Add observability stack:
   - structured logs
   - function latency dashboards
   - payment failure drilldowns
4. Add content moderation/quality scoring for generated reports.

### Scalability improvements
- Introduce queue-based async processing for palm analysis instead of client polling.
- Add caching for daily horoscope requests.
- Add server-side pagination/filtering APIs for admin tables.

### Monetization expansion
- Subscription plans
- Add-on report packs
- Multi-tier premium insight depth
- Coupon/referral mechanism

### Feature roadmap ideas
- AI chat follow-up on generated reports
- Reminder system for daily horoscope
- Enhanced chart visualizations (planetary houses/timelines)
- Deeper analytics attribution funnel (campaign-level)

---

## APPENDIX: ROUTE MAP

| Route | Component |
|---|---|
| `/` | `Index` (homepage + palmistry flow) |
| `/astrology` | `Astrology` |
| `/admin` | `Admin` |
| `/privacy` | `PrivacyPolicy` |
| `/terms` | `TermsOfService` |
| `/contact` | `Contact` |
| `/guidance-disclaimer` | `GuidanceDisclaimer` |
| `*` | `NotFound` |

## APPENDIX: ANALYTICS EVENT CATALOG

| Event name | Trigger point |
|---|---|
| `hero_cta_click` | Homepage CTA interactions |
| `palm_submit_click` | Palm form submission |
| `horoscope_submit_click` | Astrology form submission |
| `payment_unlock_click` | User clicks pay/unlock CTA |
| `payment_success` | Successful payment verification |
| `whatsapp_signup_click` | WhatsApp CTA click |
| `language_toggle` | EN/HI language switch |
| `palm_report_view` | Palm report viewed |
| `horoscope_report_view` | Horoscope report viewed |
