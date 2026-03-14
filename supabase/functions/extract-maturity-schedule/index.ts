import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders } from "../generate-memo/constants.ts";
import { extractMaturitySchedule } from "../generate-memo/maturity-extract.ts";

class RequestValidationError extends Error {
  status = 400;
}

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      throw new RequestValidationError("Request body must be a JSON object");
    }

    const record = body as Record<string, unknown>;
    const imageDataUrls = normalizeStringArray(record.imageDataUrls);
    const imageDataUrl = normalizeString(record.imageDataUrl);
    const normalizedImageDataUrls =
      imageDataUrls.length > 0
        ? imageDataUrls
        : imageDataUrl
          ? [imageDataUrl]
          : [];

    if (normalizedImageDataUrls.length === 0) {
      throw new RequestValidationError(
        "At least one maturity schedule screenshot is required",
      );
    }

    const maturitySchedule = await extractMaturitySchedule({
      imageDataUrls: normalizedImageDataUrls,
    });

    if (!maturitySchedule) {
      throw new RequestValidationError(
        "Unable to extract a maturity schedule from that screenshot. Try a tighter crop.",
      );
    }

    return new Response(
      JSON.stringify({
        maturitySchedule,
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

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
