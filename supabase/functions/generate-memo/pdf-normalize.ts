import {
  type PdfNormalizationResult,
  type PdfPreflightResult,
} from "./pdf-types.ts";

const getNormalizerConfig = () => {
  const url = Deno.env.get("PDF_NORMALIZER_URL")?.trim();
  const apiKey = Deno.env.get("PDF_NORMALIZER_API_KEY")?.trim();

  return {
    url: url || null,
    apiKey: apiKey || null,
  };
};

export const normalizePdfForExtraction = async (
  pdfBase64: string,
  preflight: PdfPreflightResult,
): Promise<PdfNormalizationResult> => {
  const { url, apiKey } = getNormalizerConfig();

  if (!url) {
    return {
      pdfBase64,
      applied: false,
      provider: null,
      reason: "Normalizer service not configured; using original PDF",
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      pdfBase64,
      preflight,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`PDF normalization failed: ${response.status}`);
    Object.assign(error, {
      status: 502,
      details,
    });
    throw error;
  }

  const data = await response.json();
  const normalizedPdfBase64 =
    typeof data?.pdfBase64 === "string" && data.pdfBase64.trim()
      ? data.pdfBase64.trim()
      : pdfBase64;
  const supplementalText =
    typeof data?.supplementalText === "string" && data.supplementalText.trim()
      ? data.supplementalText.trim()
      : undefined;
  const applied =
    data?.applied === true ||
    normalizedPdfBase64 !== pdfBase64 ||
    Boolean(supplementalText);
  const provider =
    typeof data?.provider === "string" && data.provider.trim()
      ? data.provider.trim()
      : "external-normalizer";
  const reason =
    typeof data?.reason === "string" && data.reason.trim()
      ? data.reason.trim()
      : applied
        ? "PDF normalization service returned an extraction-friendly document"
        : "Normalization service returned original PDF";

  return {
    pdfBase64: normalizedPdfBase64,
    applied,
    provider,
    reason,
    supplementalText,
  };
};
