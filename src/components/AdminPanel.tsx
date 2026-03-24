import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

type AdminRow = Tables<"admin_reading_overview">;
type ReportRow = Tables<"reports">;
type PaymentRow = Tables<"payments">;
type AnalyticsEventRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  event_name: string;
  page_path: string | null;
  metadata: Record<string, unknown>;
};

export const AdminPanel = () => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [reports, setReports] = useState<Record<string, ReportRow>>({});
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const loadData = async () => {
    setLoading(true);
    const db = supabase as any;
    const [
      { data: overview, error: overviewError },
      { data: reportRows, error: reportError },
      { data: analyticsRows, error: analyticsError },
      { data: paymentRows, error: paymentsError },
    ] = await Promise.all([
      supabase.from("admin_reading_overview").select("*").order("submitted_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      db.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500),
    ]);

    if (overviewError || reportError || analyticsError || paymentsError) {
      toast.error(overviewError?.message || reportError?.message || analyticsError?.message || paymentsError?.message || t("admin.toasts.loadFailed"));
      setLoading(false);
      return;
    }

    setRows(overview ?? []);
    setReports(
      (reportRows ?? []).reduce((acc, row) => {
        acc[row.id] = row;
        return acc;
      }, {} as Record<string, ReportRow>),
    );
    setAnalyticsEvents((analyticsRows ?? []) as AnalyticsEventRow[]);
    setPayments((paymentRows ?? []) as PaymentRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (reportId: string | null) => {
    if (!reportId || !reports[reportId]) return;
    setSelectedReportId(reportId);
    setEditingText(reports[reportId].full_report);
  };

  const saveReport = async () => {
    if (!selectedReportId) return;
    const previewLength = Math.max(120, Math.floor(editingText.length * 0.2));

    const { error } = await supabase
      .from("reports")
      .update({ full_report: editingText, free_preview: editingText.slice(0, previewLength) })
      .eq("id", selectedReportId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t("admin.toasts.updated"));
    setSelectedReportId("");
    setEditingText("");
    await loadData();
  };

  const filteredRows = rows.filter((row) => {
    const value = query.trim().toLowerCase();
    if (!value) return true;
    return (
      row.reading_id?.toLowerCase().includes(value) ||
      row.user_id?.toLowerCase().includes(value) ||
      row.payment_status?.toLowerCase().includes(value)
    );
  });

  const filteredAnalyticsEvents = analyticsEvents.filter((row) => {
    const value = query.trim().toLowerCase();
    if (!value) return true;

    return (
      row.event_name.toLowerCase().includes(value) ||
      (row.user_id ?? "").toLowerCase().includes(value) ||
      (row.page_path ?? "").toLowerCase().includes(value) ||
      JSON.stringify(row.metadata).toLowerCase().includes(value)
    );
  });

  const analyticsSummary = filteredAnalyticsEvents.reduce<Record<string, number>>((acc, row) => {
    acc[row.event_name] = (acc[row.event_name] ?? 0) + 1;
    return acc;
  }, {});

  const uniqueTrackedUsers = new Set(filteredAnalyticsEvents.map((row) => row.user_id).filter(Boolean)).size;

  const filteredPayments = payments.filter((row) => {
    const value = query.trim().toLowerCase();
    if (!value) return true;

    return (
      row.user_id.toLowerCase().includes(value) ||
      (row.provider_payment_id ?? "").toLowerCase().includes(value) ||
      (row.provider_order_id ?? "").toLowerCase().includes(value) ||
      row.status.toLowerCase().includes(value) ||
      row.plan_type.toLowerCase().includes(value)
    );
  });

  const totalPayments = filteredPayments.length;
  const successfulPayments = filteredPayments.filter((row) => row.status === "successful").length;
  const failedPayments = filteredPayments.filter((row) => row.status === "failed").length;
  const pendingPayments = filteredPayments.filter((row) => row.status === "pending").length;
  const totalPaymentRevenue = filteredPayments
    .filter((row) => row.status === "successful")
    .reduce((sum, row) => sum + Number(row.amount_inr ?? 0), 0);

  const paymentUnlockClicks = analyticsSummary.payment_unlock_click ?? 0;
  const paymentSuccessEvents = analyticsSummary.payment_success ?? 0;
  const paymentConversion = paymentUnlockClicks > 0 ? `${Math.round((paymentSuccessEvents / paymentUnlockClicks) * 100)}%` : "0%";

  return (
    <section className="space-y-6">
      <div className="mystic-glass flex flex-col gap-3 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-semibold">{t("admin.title")}</h2>
        <Input
          placeholder={t("admin.searchPlaceholder")}
          className="max-w-sm focus-mystic"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mystic-glass overflow-x-auto rounded-xl p-4">
        {loading ? (
          <CosmicLoader variant="section" size="medium" label={t("common.loading.submissions")} />
        ) : (
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-border/80 text-left">
                <th className="px-2 py-3">{t("admin.headers.reading")}</th>
                <th className="px-2 py-3">{t("admin.headers.user")}</th>
                <th className="px-2 py-3">{t("admin.headers.status")}</th>
                <th className="px-2 py-3">{t("admin.headers.payment")}</th>
                <th className="px-2 py-3">{t("admin.headers.unlocked")}</th>
                <th className="px-2 py-3">{t("admin.headers.action")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.reading_id ?? Math.random()} className="border-b border-border/40">
                  <td className="px-2 py-3 font-mono text-xs">{row.reading_id}</td>
                  <td className="px-2 py-3 font-mono text-xs">{row.user_id}</td>
                  <td className="px-2 py-3">{row.analysis_status}</td>
                  <td className="px-2 py-3">{row.payment_status ?? t("admin.pending")}</td>
                  <td className="px-2 py-3">{row.is_unlocked ? t("admin.yes") : t("admin.no")}</td>
                  <td className="px-2 py-3">
                    <Button size="sm" variant="mystic" onClick={() => openEdit(row.report_id)}>
                      {t("common.actions.editReport")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mystic-glass space-y-4 rounded-xl p-5">
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold">{t("admin.analyticsTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("admin.analyticsDescription")}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.totalEvents")}</p>
            <p className="mt-1 text-2xl font-semibold">{filteredAnalyticsEvents.length}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.uniqueUsers")}</p>
            <p className="mt-1 text-2xl font-semibold">{uniqueTrackedUsers}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.trackedActions")}</p>
            <p className="mt-1 text-2xl font-semibold">{Object.keys(analyticsSummary).length}</p>
          </article>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.paymentClicks")}</p>
            <p className="mt-1 text-2xl font-semibold">{paymentUnlockClicks}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.paymentSuccessEvents")}</p>
            <p className="mt-1 text-2xl font-semibold">{paymentSuccessEvents}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.paymentConversion")}</p>
            <p className="mt-1 text-2xl font-semibold">{paymentConversion}</p>
          </article>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries(analyticsSummary).map(([eventName, count]) => (
            <article key={eventName} className="flex items-center justify-between rounded-lg border border-border/70 bg-background/20 px-3 py-2">
              <p className="text-sm text-foreground/90">{eventName}</p>
              <p className="rounded-full border border-primary/40 bg-primary/20 px-2 py-0.5 text-xs text-primary">{count}</p>
            </article>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-border/80 text-left">
                <th className="px-3 py-2">{t("admin.analyticsHeaders.time")}</th>
                <th className="px-3 py-2">{t("admin.analyticsHeaders.event")}</th>
                <th className="px-3 py-2">{t("admin.analyticsHeaders.user")}</th>
                <th className="px-3 py-2">{t("admin.analyticsHeaders.page")}</th>
                <th className="px-3 py-2">{t("admin.analyticsHeaders.metadata")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnalyticsEvents.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={5}>
                    {t("admin.noEvents")}
                  </td>
                </tr>
              ) : (
                filteredAnalyticsEvents.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 align-top">
                    <td className="px-3 py-3 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs font-medium">{row.event_name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.user_id ?? "-"}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{row.page_path ?? "-"}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{JSON.stringify(row.metadata)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mystic-glass space-y-4 rounded-xl p-5">
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold">{t("admin.paymentsTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("admin.paymentsDescription")}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.totalPayments")}</p>
            <p className="mt-1 text-2xl font-semibold">{totalPayments}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.successfulPayments")}</p>
            <p className="mt-1 text-2xl font-semibold">{successfulPayments}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.failedPayments")}</p>
            <p className="mt-1 text-2xl font-semibold">{failedPayments}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.pendingPayments")}</p>
            <p className="mt-1 text-2xl font-semibold">{pendingPayments}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("admin.totalRevenue")}</p>
            <p className="mt-1 text-2xl font-semibold">₹{Math.round(totalPaymentRevenue)}</p>
          </article>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-border/80 text-left">
                <th className="px-3 py-2">{t("admin.paymentsHeaders.time")}</th>
                <th className="px-3 py-2">{t("admin.paymentsHeaders.user")}</th>
                <th className="px-3 py-2">{t("admin.paymentsHeaders.plan")}</th>
                <th className="px-3 py-2">{t("admin.paymentsHeaders.status")}</th>
                <th className="px-3 py-2">{t("admin.paymentsHeaders.amount")}</th>
                <th className="px-3 py-2">{t("admin.paymentsHeaders.order")}</th>
                <th className="px-3 py-2">{t("admin.paymentsHeaders.payment")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={7}>
                    {t("admin.noPayments")}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 align-top">
                    <td className="px-3 py-3 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.user_id}</td>
                    <td className="px-3 py-3 text-xs">{row.plan_type}</td>
                    <td className="px-3 py-3 text-xs">{row.status}</td>
                    <td className="px-3 py-3 text-xs">₹{Number(row.amount_inr)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.provider_order_id ?? "-"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.provider_payment_id ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReportId && (
        <div className="mystic-glass space-y-3 rounded-xl p-5">
          <h3 className="text-xl font-semibold">{t("admin.editTitle")}</h3>
          <textarea
            className="focus-mystic min-h-60 w-full rounded-md border border-input bg-background/80 p-3 text-sm"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="hero" onClick={saveReport}>
              {t("common.actions.save")}
            </Button>
            <Button variant="ghost" onClick={() => setSelectedReportId("")}>
              {t("common.actions.cancel")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
