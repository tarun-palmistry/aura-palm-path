import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";

export const CosmicLoaderShowcase = () => {
  const { t } = useLanguage();

  return (
    <section id="loader-preview" className="scroll-mt-28 border-b border-border/70 py-16">
      <div className="container space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.loaderPreview.label")}</p>
          <h2 className="text-3xl font-semibold md:text-4xl">{t("homepage.loaderPreview.title")}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{t("homepage.loaderPreview.description")}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="mystic-glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold">{t("homepage.loaderPreview.variants.fullPage")}</h3>
            <div className="mt-4 rounded-xl border border-border/70 bg-background/35 p-4">
              <CosmicLoader size="large" variant="section" label={t("homepage.loaderPreview.messages.reading")} sublabel={t("homepage.loaderPreview.sublabel")} />
            </div>
          </article>

          <article className="mystic-glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold">{t("homepage.loaderPreview.variants.section")}</h3>
            <div className="mt-4 rounded-xl border border-border/70 bg-background/35 p-4">
              <CosmicLoader size="medium" variant="section" label={t("homepage.loaderPreview.messages.chart")} />
            </div>
          </article>

          <article className="mystic-glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold">{t("homepage.loaderPreview.variants.button")}</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="hero" disabled>
                <CosmicLoader size="small" variant="button" />
                {t("homepage.loaderPreview.messages.analyzing")}
              </Button>
              <Button variant="mystic" disabled>
                <CosmicLoader size="small" variant="button" />
                {t("homepage.loaderPreview.messages.verifying")}
              </Button>
            </div>
          </article>

          <article className="mystic-glass rounded-2xl p-6">
            <h3 className="text-xl font-semibold">{t("homepage.loaderPreview.variants.inline")}</h3>
            <div className="mt-4 rounded-xl border border-border/70 bg-background/35 p-4">
              <CosmicLoader
                size="small"
                variant="inline"
                label={t("homepage.loaderPreview.messages.unlocking")}
                sublabel={t("homepage.loaderPreview.messages.path")}
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};
