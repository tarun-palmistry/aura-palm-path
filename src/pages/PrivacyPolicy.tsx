import { useEffect } from "react";
import { TrustPageLayout } from "@/components/legal/TrustPageLayout";

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "Privacy Policy | AstraPalm";
  }, []);

  return (
    <TrustPageLayout
      eyebrow="Trust & Compliance"
      title="Privacy Policy"
      intro="Your palm images, birth details, and reports are private by default and scoped to your account. This policy explains what we collect and how we protect it."
      lastUpdated="March 24, 2026"
      sections={[
        {
          title: "Information We Collect",
          body: [
            "We collect account details such as your email and profile information, plus the content you submit including palm images, birth details, and report inputs.",
            "We also collect operational analytics like feature clicks and report views to improve reliability, product quality, and support.",
          ],
        },
        {
          title: "How We Use Your Data",
          body: [
            "We use your data to generate palmistry and astrology insights, show your saved reports, process payments, and secure your account.",
            "We may also use aggregated, non-identifying usage trends to improve performance and user experience.",
          ],
        },
        {
          title: "Data Security and Retention",
          body: [
            "Your data is stored using managed cloud infrastructure with access controls designed to keep user records private and protected.",
            "We retain your reports so you can revisit them unless you request deletion, or unless retention is required for legal or payment compliance.",
          ],
        },
        {
          title: "Your Rights",
          body: [
            "You can request access, correction, or deletion of your data by contacting support.",
            "If you no longer want account-based storage, you may request account deletion and associated report cleanup.",
          ],
        },
      ]}
    />
  );
};

export default PrivacyPolicy;