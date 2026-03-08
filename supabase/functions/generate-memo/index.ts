import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders } from "./constants.ts";
import { generateMemoWithGemini } from "./gemini.ts";
import { postProcessMemo } from "./postprocess.ts";
import { buildPrompt } from "./prompt.ts";
import { parseGenerateMemoRequest } from "./request.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, optionalSections, scheduleOverrides } =
      parseGenerateMemoRequest(await req.json());

    console.log("Calling Gemini API...");

    const prompt = buildPrompt(optionalSections, scheduleOverrides ?? {});
    const memo = await generateMemoWithGemini(prompt, pdfBase64);
    const safeMemo = postProcessMemo(memo);

    console.log("Memo generated successfully");

    return new Response(JSON.stringify({ memo: safeMemo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;

    if (status >= 400 && status < 500) {
      const errorMessage =
        status === 429
          ? "Rate limit exceeded. Please try again in a moment."
          : status === 402
            ? "AI credits depleted. Please add credits to continue."
            : error instanceof Error
              ? error.message
              : "Request failed";

      return new Response(JSON.stringify({ error: errorMessage }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
