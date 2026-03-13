import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders } from "./constants.ts";
import { generateMemoWithGemini } from "./gemini.ts";
import { buildMemoStructure } from "./memo-sections.ts";
import { normalizePdfForExtraction } from "./pdf-normalize.ts";
import { preflightPdf } from "./pdf-preflight.ts";
import { type PdfProcessingMetadata } from "./pdf-types.ts";
import { postProcessMemo } from "./postprocess.ts";
import { buildPrompt } from "./prompt.ts";
import { parseGenerateMemoRequest } from "./request.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, extractedArtifact, optionalSections, scheduleOverrides } =
      parseGenerateMemoRequest(await req.json());

    let preflightStatus: PdfProcessingMetadata["preflightStatus"] = "healthy";
    let preflightReason = "PDF text layer looks usable for direct extraction";
    const pdfProcessing: PdfProcessingMetadata = {
      preflightStatus,
      preflightReason,
      normalizationApplied: false,
      normalizationProvider: null,
      normalizationReason: "Original PDF used",
    };

    let workingPdfBase64 = pdfBase64;
    let supplementalText: string | undefined;
    const sourceMode: "pdf" | "artifact" | "hybrid" = extractedArtifact
      ? pdfBase64
        ? "hybrid"
        : "artifact"
      : "pdf";

    if (pdfBase64) {
      const preflight = preflightPdf(pdfBase64);
      preflightStatus = preflight.status;
      preflightReason = preflight.reason;
      pdfProcessing.preflightStatus = preflight.status;
      pdfProcessing.preflightReason = preflight.reason;
      console.log("PDF preflight completed", {
        status: preflight.status,
        reason: preflight.reason,
        metrics: preflight.metrics,
      });

      if (preflight.status === "unsupported") {
        return new Response(
          JSON.stringify({
            error: preflight.reason,
            pdfProcessing,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (preflight.status === "needs_normalization") {
        console.log("PDF flagged for normalization fallback");
        const normalizedPdf = await normalizePdfForExtraction(pdfBase64, preflight);
        workingPdfBase64 = normalizedPdf.pdfBase64;
        supplementalText = normalizedPdf.supplementalText;
        pdfProcessing.normalizationApplied = normalizedPdf.applied;
        pdfProcessing.normalizationProvider = normalizedPdf.provider;
        pdfProcessing.normalizationReason = normalizedPdf.reason;
        console.log("PDF normalization completed", {
          applied: normalizedPdf.applied,
          provider: normalizedPdf.provider,
          reason: normalizedPdf.reason,
          supplementalTextLength: normalizedPdf.supplementalText?.length ?? 0,
        });

        if (!normalizedPdf.applied) {
          pdfProcessing.warning =
            "PDF looked extraction-unfriendly, but no normalizer was configured. Memo was generated from the original document.";
        }
      }
    }

    console.log("Calling Gemini API...", {
      sourceMode,
      pdfBytesApprox: workingPdfBase64
        ? Math.round((workingPdfBase64.length * 3) / 4)
        : 0,
      extractedArtifactLength: extractedArtifact?.length ?? 0,
      supplementalTextLength: supplementalText?.length ?? 0,
    });

    const prompt = buildPrompt(optionalSections, scheduleOverrides ?? {}, {
      extractedArtifact,
      sourceMode,
      supplementalText,
    });
    const memo = await generateMemoWithGemini(prompt, workingPdfBase64);
    const safeMemo = postProcessMemo(memo);
    const memoStructure = buildMemoStructure(safeMemo);

    console.log("Memo generated successfully");

    return new Response(
      JSON.stringify({
        memo: safeMemo,
        memoTitleHtml: memoStructure.titleHtml,
        memoSections: memoStructure.sections,
        pdfProcessing,
      }),
      {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;

    if (status >= 400 && status < 500) {
      console.error("Client-facing generate-memo failure", {
        status,
        error:
          error instanceof Error
            ? {
                message: error.message,
                details:
                  "details" in error && typeof error.details === "string"
                    ? error.details
                    : undefined,
                source:
                  "source" in error && typeof error.source === "string"
                    ? error.source
                    : undefined,
              }
            : error,
      });
      const errorMessage =
        status === 429
          ? "Rate limit exceeded. Please try again in a moment."
          : status === 402
            ? "AI credits depleted. Please add credits to continue."
            : error instanceof Error
              ? error.message
              : "Request failed";

      const errorDetails =
        typeof error === "object" &&
        error !== null &&
        "details" in error &&
        typeof error.details === "string"
          ? error.details
          : undefined;
      const errorSource =
        typeof error === "object" &&
        error !== null &&
        "source" in error &&
        typeof error.source === "string"
          ? error.source
          : undefined;

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: errorDetails,
          source: errorSource,
        }),
        {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.error("Error in generate-memo function:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
