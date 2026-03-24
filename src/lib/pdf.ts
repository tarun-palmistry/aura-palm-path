import { jsPDF } from "jspdf";

type PdfSection = {
  heading: string;
  body: string;
};

type DownloadReportPdfOptions = {
  title: string;
  subtitle?: string;
  fileName: string;
  sections: PdfSection[];
};

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "report";

export const downloadReportPdf = ({ title, subtitle, fileName, sections }: DownloadReportPdfOptions) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 44;
  const marginTop = 52;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;
  let cursorY = marginTop;

  const ensurePageSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight > pageHeight - 44) {
      doc.addPage();
      cursorY = marginTop;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(title, marginX, cursorY);
  cursorY += 24;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const subtitleLines = doc.splitTextToSize(subtitle, maxWidth);
    doc.text(subtitleLines, marginX, cursorY);
    cursorY += subtitleLines.length * 15 + 8;
  }

  sections.forEach(({ heading, body }) => {
    if (!heading || !body) return;

    const sectionBody = body.trim();
    if (!sectionBody) return;

    ensurePageSpace(44);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const headingLines = doc.splitTextToSize(heading, maxWidth);
    doc.text(headingLines, marginX, cursorY);
    cursorY += headingLines.length * 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(sectionBody, maxWidth);

    lines.forEach((line: string) => {
      ensurePageSpace(16);
      doc.text(line, marginX, cursorY);
      cursorY += 15;
    });

    cursorY += 10;
  });

  doc.save(`${sanitizeFileName(fileName)}.pdf`);
};
