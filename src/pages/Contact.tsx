import { useEffect } from "react";
import { TrustPageLayout } from "@/components/legal/TrustPageLayout";

const Contact = () => {
  useEffect(() => {
    document.title = "Contact | AstroPalm";
  }, []);

  return (
    <TrustPageLayout
      eyebrow="Support"
      title="Contact"
      intro="Need help with your account, report unlocks, or billing? Reach out and our team will assist you as quickly as possible."
      lastUpdated="March 24, 2026"
      sections={[
        {
          title: "General Support",
          body: [
            "Email: support@astropalm.app",
            "Typical response time: within 24–48 hours on business days.",
          ],
        },
        {
          title: "Billing and Payment Help",
          body: [
            "For payment errors, include your order ID and payment ID from the app so we can verify the transaction quickly.",
            "If a payment succeeded but content did not unlock, contact support and we will review and resolve it.",
          ],
        },
        {
          title: "Privacy Requests",
          body: [
            "For data access, correction, or deletion requests, contact: privacy@astropalm.app.",
            "Please send requests from your registered email to help us securely verify account ownership.",
          ],
        },
      ]}
    />
  );
};

export default Contact;