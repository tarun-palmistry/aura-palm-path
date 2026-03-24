import type { Tables } from "@/integrations/supabase/types";

type ReportRow = Tables<"reports">;

type ReportViewerProps = {
  report: ReportRow;
};

export const ReportViewer = ({ report }: ReportViewerProps) => {
  return (
    <section className="mystic-glass space-y-4 rounded-xl p-6">
      <div className="space-y-1">
        <p className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
          Reading ready
        </p>
        <h2 className="text-3xl font-semibold">Your Palm Reading</h2>
        <p className="text-sm text-muted-foreground">Based on extracted palm shape, lines, and mounts from your scan.</p>
      </div>

      <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
        <h3 className="text-xl font-semibold">Free Preview</h3>
        <p className="leading-relaxed text-muted-foreground">{report.free_preview}</p>
      </article>

      <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
        <h3 className="text-xl font-semibold">Full Reading</h3>
        <p className="whitespace-pre-line leading-relaxed text-foreground/95">{report.full_report}</p>
      </article>
    </section>
  );
};
