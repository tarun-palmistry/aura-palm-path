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

export const AdminPanel = () => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [reports, setReports] = useState<Record<string, ReportRow>>({});
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [{ data: overview, error: overviewError }, { data: reportRows, error: reportError }] = await Promise.all([
      supabase.from("admin_reading_overview").select("*").order("submitted_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
    ]);

    if (overviewError || reportError) {
      toast.error(overviewError?.message || reportError?.message || t("admin.toasts.loadFailed"));
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
