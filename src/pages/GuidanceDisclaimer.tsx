import { useEffect } from "react";
import { TrustPageLayout } from "@/components/legal/TrustPageLayout";

const GuidanceDisclaimer = () => {
  useEffect(() => {
    document.title = "Guidance Disclaimer | AstroPalm";
  }, []);

  return (
    <TrustPageLayout
      eyebrow="Important Notice"
      title="Guidance Disclaimer"
      intro="Please read this notice carefully before relying on any generated insight from the platform."
      lastUpdated="March 24, 2026"
      sections={[
        {
          title: "Informational Use Only",
          body: [
            "All palmistry and astrology insights on this platform are provided for informational and guidance purposes only.",
            "They are intended to support reflection, not to replace personal judgment or qualified professional advice.",
          ],
        },
        {
          title: "Not Professional Advice",
          body: [
            "Content provided here is not medical, legal, financial, mental health, or emergency advice.",
            "For serious personal, legal, health, or financial concerns, consult a licensed professional.",
          ],
        },
        {
          title: "No Guaranteed Outcomes",
          body: [
            "Guidance and predictions are interpretive in nature and do not guarantee specific future outcomes.",
            "Any decisions you make based on platform content remain your sole responsibility.",
          ],
        },
      ]}
    />
  );
};

export default GuidanceDisclaimer;