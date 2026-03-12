import { type PdfPreflightMetrics, type PdfPreflightResult } from "./pdf-types.ts";

const decodeBase64ToLatin1 = (pdfBase64: string) =>
  new TextDecoder("latin1").decode(
    Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0)),
  );

const countMatches = (content: string, pattern: RegExp) =>
  content.match(pattern)?.length ?? 0;

const extractPdfStrings = (content: string) => {
  const extracted: string[] = [];
  const literalStringPattern = /\(([^()]*)\)\s*(?:Tj|TJ)/g;

  for (const match of content.matchAll(literalStringPattern)) {
    const literal = match[1]?.replace(/\\([()\\])/g, "$1").trim();

    if (literal) {
      extracted.push(literal);
    }

    if (extracted.join(" ").length > 800) {
      break;
    }
  }

  return extracted.join(" ").replace(/\s+/g, " ").trim();
};

const buildMetrics = (content: string): PdfPreflightMetrics => {
  const pageCountEstimate = countMatches(content, /\/Type\s*\/Page\b/g);
  const imageObjectCount = countMatches(content, /\/Subtype\s*\/Image\b/g);
  const textOperatorCount = countMatches(content, /\b(?:BT|Tj|TJ|Tf|ET)\b/g);
  const fontObjectCount = countMatches(content, /\/Font\b/g);
  const extractedCharCount = extractPdfStrings(content).length;

  return {
    pageCountEstimate,
    imageObjectCount,
    textOperatorCount,
    fontObjectCount,
    extractedCharCount,
  };
};

export const preflightPdf = (pdfBase64: string): PdfPreflightResult => {
  const cleanedPdfBase64 = pdfBase64.replace(
    /^data:application\/pdf;base64,/,
    "",
  );

  let content = "";

  try {
    content = decodeBase64ToLatin1(cleanedPdfBase64);
  } catch {
    return {
      status: "unsupported",
      reason: "Uploaded file could not be decoded as a PDF",
      metrics: {
        pageCountEstimate: 0,
        imageObjectCount: 0,
        textOperatorCount: 0,
        fontObjectCount: 0,
        extractedCharCount: 0,
      },
    };
  }

  if (!content.startsWith("%PDF-")) {
    return {
      status: "unsupported",
      reason: "Uploaded file does not appear to be a valid PDF",
      metrics: buildMetrics(content),
    };
  }

  const metrics = buildMetrics(content);
  const hasRestrictionMarker = /\/Encrypt\b/.test(content);

  const weakTextLayer =
    metrics.extractedCharCount < 120 &&
    (metrics.textOperatorCount < 15 || metrics.fontObjectCount < 2);
  const imageHeavy =
    metrics.imageObjectCount >= 3 &&
    metrics.imageObjectCount > metrics.textOperatorCount;

  if (hasRestrictionMarker || weakTextLayer || imageHeavy) {
    const reason = hasRestrictionMarker
      ? "PDF includes restriction markers; proceeding with extraction fallback rather than hard-failing"
      : "PDF appears to have a weak text layer and may require OCR normalization";

    return {
      status: "needs_normalization",
      reason,
      metrics,
    };
  }

  return {
    status: "healthy",
    reason: "PDF text layer looks usable for direct extraction",
    metrics,
  };
};
