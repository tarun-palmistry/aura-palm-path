import { useEffect } from "react";
import { TrustPageLayout } from "@/components/legal/TrustPageLayout";

const TermsOfService = () => {
  useEffect(() => {
    document.title = "Terms of Service | AstroPalm";
  }, []);

  return (
    <TrustPageLayout
      eyebrow="Trust & Compliance"
      title="Terms of Service"
      intro="These terms govern your use of the platform, including account access, report usage, and payment-related functionality."
      lastUpdated="March 24, 2026"
      sections={[
        {
          title: "Use of the Platform",
          body: [
            "You agree to use this platform lawfully and responsibly. Misuse, abuse, reverse-engineering, or attempts to compromise service integrity are prohibited.",
            "You are responsible for keeping your account credentials secure and for activity performed under your account.",
          ],
        },
        {
          title: "Generated Insights",
          body: [
            "Palmistry and astrology reports are generated from submitted inputs and are intended for reflection and guidance only.",
            "You acknowledge that generated content may vary in interpretation and should not be treated as guaranteed outcomes.",
          ],
        },
        {
          title: "Payments and Unlocks",
          body: [
            "Paid features unlock premium content based on selected plan types. Payment processing is handled through integrated providers.",
            "If a transaction fails or is cancelled, premium content remains locked unless payment verification succeeds.",
          ],
        },
        {
          title: "Service Availability",
          body: [
            "We aim for continuous availability but may perform maintenance, upgrades, or emergency fixes that temporarily affect access.",
            "We reserve the right to update features, terms, and pricing with reasonable notice where applicable.",
          ],
        },
      ]}
    />
  );
};

export default TermsOfService;