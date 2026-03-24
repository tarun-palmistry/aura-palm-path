import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { UnlockPlansCard } from "@/components/UnlockPlansCard";
import type { PaymentStage, PlanType } from "@/lib/paymentPlans";

type ReportRow = Tables<"reports">;

type ReportViewerProps = {
  report: ReportRow;
  isUnlocked: boolean;
  activePlan: PlanType | null;
  paymentStage: PaymentStage;
  onUnlock: (planType: PlanType) => void;
};

const parseReportSections = (fullReport: string) => {
  return fullReport
    .split(/\n\n+/)
    .map((block) => {
      const [heading, ...rest] = block.split("\n");
      return {
        heading: heading?.trim() ?? "",
        body: rest.join("\n").trim(),
      };
    })
    .filter((item) => item.heading && item.body);
};

export const ReportViewer = ({ report, isUnlocked, activePlan, paymentStage, onUnlock }: ReportViewerProps) => {
  const { t } = useLanguage();
  const sections = parseReportSections(report.full_report);
  const freeSection = sections.find((section) => {
    const heading = section.heading.toLowerCase();
    return heading.includes("personality") || heading.includes("व्यक्तित्व");
  });
  const lockedSectionLabels = [
    t("payments.lockedPalmSections.love"),
    t("payments.lockedPalmSections.career"),
    t("payments.lockedPalmSections.future"),
    t("payments.lockedPalmSections.advice"),
  ];

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

      {freeSection && (
        <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
          <h3 className="text-xl font-semibold">{freeSection.heading}</h3>
          <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{freeSection.body}</p>
        </article>
      )}

      {isUnlocked ? (
        <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
          <h3 className="text-xl font-semibold">{t("report.fullReading")}</h3>
          <p className="whitespace-pre-line leading-relaxed text-foreground/95">{report.full_report}</p>
        </article>
      ) : (
        <>
          <UnlockPlansCard
            context="palmistry"
            activePlan={activePlan}
            stage={paymentStage}
            onPay={onUnlock}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {lockedSectionLabels.map((label) => (
              <article key={label} className="relative overflow-hidden rounded-lg border border-border/70 bg-background/20 p-4">
                <div className="pointer-events-none absolute inset-0 bg-background/60 backdrop-blur-sm" />
                <div className="relative space-y-2">
                  <h3 className="text-base font-semibold text-foreground/80">{label}</h3>
                  <p className="text-sm text-muted-foreground">{t("payments.lockedNote")}</p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
