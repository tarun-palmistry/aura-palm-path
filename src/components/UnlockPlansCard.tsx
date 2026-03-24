import { useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";
import { useLanguage } from "@/contexts/LanguageContext";
import { PAYMENT_PLAN_ORDER, type PaymentStage, type PlanType } from "@/lib/paymentPlans";

type UnlockPlansCardProps = {
  context: "palmistry" | "horoscope";
  activePlan: PlanType | null;
  stage: PaymentStage;
  onPay: (planType: PlanType) => void;
};

export const UnlockPlansCard = ({ context, activePlan, stage, onPay }: UnlockPlansCardProps) => {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(context === "palmistry" ? "palmistry" : "horoscope");

  const stageLabel =
    stage === "creating"
      ? t("payments.status.creatingOrder")
      : stage === "checkout"
        ? t("payments.status.openingCheckout")
        : stage === "verifying"
          ? t("payments.status.verifyingPayment")
          : null;

  const isBusy = stage !== "idle";

  const planCards = useMemo(
    () =>
      PAYMENT_PLAN_ORDER.map((plan) => ({
        plan,
        title: t(`payments.plans.${plan}.title`),
        description: t(`payments.plans.${plan}.description`),
        price: t(`payments.plans.${plan}.price`),
        badge: plan === "combo" ? t("payments.plans.combo.badge") : "",
      })),
    [t],
  );

  return (
    <article className="mystic-glass space-y-5 rounded-xl p-5">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          {t("payments.unlockBadge")}
        </p>
        <h3 className="text-2xl font-semibold">{t(`payments.${context}.title`)}</h3>
        <p className="text-sm text-muted-foreground">{t(`payments.${context}.description`)}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3" aria-busy={isBusy}>
        {planCards.map((item) => {
          const selected = selectedPlan === item.plan;
          const isActive = activePlan === item.plan;

          return (
            <button
              type="button"
              key={item.plan}
              onClick={() => setSelectedPlan(item.plan)}
              disabled={isBusy}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selected ? "border-primary bg-primary/10 shadow-mystic" : "border-border/70 bg-background/30 hover:border-primary/40"
              }`}
            >
              {isBusy && isActive && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-primary">
                  <CosmicLoader size="small" variant="button" className="scale-[0.5] -mx-1" />
                  {t("payments.status.processing")}
                </span>
              )}
              {item.badge && (
                <span className="absolute right-3 top-3 rounded-full border border-primary/30 bg-primary/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary">
                  {item.badge}
                </span>
              )}
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.price}</p>
              <p className="mt-1 text-base font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <Button type="button" variant="hero" className="w-full" onClick={() => onPay(selectedPlan)} disabled={isBusy}>
          {isBusy
            ? activePlan === selectedPlan
              ? (
                <>
                  <CosmicLoader size="small" variant="button" className="scale-[0.62]" />
                  {stageLabel ?? t("common.loading.processingPayment")}
                </>
              )
              : t("payments.status.processingAnother")
            : t("payments.payAndUnlock")}
        </Button>

        {isBusy && (
          <p className="inline-flex items-center gap-2 text-xs text-primary/90">
            <CosmicLoader size="small" variant="inline" className="scale-[0.56] -mx-2" />
            {stageLabel ?? t("common.loading.processingPayment")}
          </p>
        )}

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <p className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t("payments.oneTime")}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t("payments.instantAccess")}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t("payments.secure")}
          </p>
        </div>

        {import.meta.env.DEV && <p className="text-xs text-primary">{t("payments.testMode")}</p>}
      </div>
    </article>
  );
};
