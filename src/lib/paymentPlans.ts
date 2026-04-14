export type PlanType = "palmistry" | "horoscope" | "combo" | "whatsapp_monthly";

export const PAYMENT_PLAN_ORDER: PlanType[] = ["palmistry", "horoscope", "combo"];

export type PaymentStage = "idle" | "creating" | "checkout" | "verifying";
