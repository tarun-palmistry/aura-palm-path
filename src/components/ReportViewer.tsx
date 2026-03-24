import { Download } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { UnlockPlansCard } from "@/components/UnlockPlansCard";
import { Button } from "@/components/ui/button";
import { downloadReportPdf } from "@/lib/pdf";
import type { PaymentStage, PlanType } from "@/lib/paymentPlans";
import { trackEvent } from "@/lib/analytics";

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

const detectSectionBody = (
  sections: Array<{ heading: string; body: string }>,
  keywords: string[],
) => {
  const match = sections.find((section) => {
    const heading = section.heading.toLowerCase();
    return keywords.some((keyword) => heading.includes(keyword));
  });

  return match?.body?.trim() ?? "";
};

const deriveKeyAdvice = (futureGuidance: string) => {
  const fragments = futureGuidance
    .split(/(?<=[.!?।])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return fragments.join(" ");
};

export const ReportViewer = ({ report, isUnlocked, activePlan, paymentStage, onUnlock }: ReportViewerProps) => {
  const { t } = useLanguage();
  const trackedReadingRef = useRef<string | null>(null);
  const sections = useMemo(() => parseReportSections(report.full_report), [report.full_report]);

  const personalityOverview =
    detectSectionBody(sections, ["personality", "व्यक्तित्व"]) || report.free_preview;
  const loveAndRelationships = detectSectionBody(sections, ["love", "relationship", "प्रेम", "रिश्त"]) || report.free_preview;
  const careerInsights = detectSectionBody(sections, ["career", "profession", "करियर", "पेशा"]);
  const strengths = detectSectionBody(sections, ["strength", "weakness", "ताकत", "कमजोर"]);
  const futureGuidance = detectSectionBody(sections, ["future", "guidance", "भविष्य", "मार्गदर्शन"]);
  const keyAdvice =
    detectSectionBody(sections, ["advice", "key advice", "सलाह"]) || deriveKeyAdvice(futureGuidance || report.free_preview);

  const premiumSections = [
    {
      id: "personality",
      title: t("report.sections.personalityOverview"),
      body: personalityOverview,
      alwaysVisible: true,
    },
    {
      id: "love",
      title: t("report.sections.loveRelationships"),
      body: loveAndRelationships,
    },
    {
      id: "career",
      title: t("report.sections.careerStrengths"),
      body: [careerInsights, strengths].filter(Boolean).join("\n\n"),
    },
    {
      id: "future",
      title: t("report.sections.futureGuidance"),
      body: futureGuidance,
    },
    {
      id: "advice",
      title: t("report.sections.keyAdvice"),
      body: keyAdvice,
    },
  ].filter((section) => section.body.trim());

  const featureHighlights = [
    { label: t("report.highlights.palmShape"), value: String((report.generated_from_features as Record<string, unknown>)?.palm_shape ?? "") },
    { label: t("report.highlights.lifeLine"), value: String((report.generated_from_features as Record<string, unknown>)?.life_line_clarity ?? "") },
    { label: t("report.highlights.heartLine"), value: String((report.generated_from_features as Record<string, unknown>)?.heart_line ?? "") },
    { label: t("report.highlights.headLine"), value: String((report.generated_from_features as Record<string, unknown>)?.head_line ?? "") },
  ].filter((item) => item.value && item.value !== "null" && item.value !== "undefined");

  useEffect(() => {
    if (!report.reading_id || trackedReadingRef.current === report.reading_id) return;

    trackedReadingRef.current = report.reading_id;
    void trackEvent({
      eventName: "palm_report_view",
      metadata: {
        readingId: report.reading_id,
        unlocked: isUnlocked,
      },
    });
  }, [report.reading_id, isUnlocked]);

  const handleDownloadPdf = () => {
    const pdfSections = [
      { heading: t("report.freePreview"), body: report.free_preview },
      ...premiumSections.map((section) => ({ heading: section.title, body: section.body })),
    ];

    downloadReportPdf({
      title: t("report.title"),
      subtitle: t("report.subtitle"),
      fileName: `palm-reading-${report.reading_id}`,
      sections: pdfSections,
    });
  };

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

      {featureHighlights.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {featureHighlights.map((highlight) => (
            <article key={highlight.label} className="rounded-lg border border-border/70 bg-background/20 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{highlight.label}</p>
              <p className="mt-1 text-sm text-foreground/90">{highlight.value}</p>
            </article>
          ))}
        </div>
      )}

      {isUnlocked ? (
        <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">{t("report.fullReading")}</h3>
            <Button type="button" variant="mystic" size="sm" className="gap-2" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("common.actions.downloadPdf")}
            </Button>
          </div>
          <div className="space-y-3">
            {premiumSections.map((section) => (
              <article key={section.id} className="rounded-lg border border-border/70 bg-background/20 p-4">
                <h4 className="text-base font-semibold">{section.title}</h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/95">{section.body}</p>
              </article>
            ))}
          </div>
        </article>
      ) : (
        <>
          {premiumSections
            .filter((section) => section.alwaysVisible)
            .map((section) => (
              <article key={section.id} className="space-y-2 rounded-lg border border-border/80 bg-background/30 p-4">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{section.body}</p>
              </article>
            ))}

          <UnlockPlansCard
            context="palmistry"
            activePlan={activePlan}
            stage={paymentStage}
            onPay={onUnlock}
          />

          <div className="grid gap-3 md:grid-cols-2">
            {premiumSections
              .filter((section) => !section.alwaysVisible)
              .map((section) => (
              <article key={section.id} className="relative overflow-hidden rounded-lg border border-border/70 bg-background/20 p-4">
                <div className="pointer-events-none absolute inset-0 bg-background/60 backdrop-blur-sm" />
                <div className="relative space-y-2">
                  <h3 className="text-base font-semibold text-foreground/80">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{t("report.lockedSectionNote")}</p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
