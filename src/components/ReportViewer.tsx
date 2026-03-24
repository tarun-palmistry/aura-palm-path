import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

type ReportRow = Tables<"reports">;

type ReportViewerProps = {
  report: ReportRow;
};

export const ReportViewer = ({ report }: ReportViewerProps) => {
  const { t } = useLanguage();

  return (
    <section className="mystic-glass space-y-4 rounded-xl p-6">
      <div className="space-y-1">
        <p className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
          {t("report.badge")}
        </p>
        <h2 className="text-3xl font-semibold">{t("report.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("report.subtitle")}</p>
      </div>

      <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
        <h3 className="text-xl font-semibold">{t("report.freePreview")}</h3>
        <p className="leading-relaxed text-muted-foreground">{report.free_preview}</p>
      </article>

      <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
        <h3 className="text-xl font-semibold">{t("report.fullReading")}</h3>
        <p className="whitespace-pre-line leading-relaxed text-foreground/95">{report.full_report}</p>
      </article>
    </section>
  );
};
