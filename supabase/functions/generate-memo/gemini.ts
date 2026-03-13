const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const DEFAULT_GEMINI_API_VERSION = "v1beta";

const normalizeEnvValue = (value?: string | null) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/^['"]|['"]$/g, "");
};

const getGeminiApiKey = () => {
  const apiKey = normalizeEnvValue(Deno.env.get("GEMINI_API_KEY"));

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  return apiKey;
};

const getGeminiModel = () =>
  (normalizeEnvValue(Deno.env.get("GEMINI_MODEL")) || DEFAULT_GEMINI_MODEL)
    .replace(/^models\//, "");

const getGeminiApiVersion = () =>
  normalizeEnvValue(Deno.env.get("GEMINI_API_VERSION")) ||
  DEFAULT_GEMINI_API_VERSION;

export const generateMemoWithGemini = async (
  prompt: string,
  pdfBase64?: string,
) => {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const apiVersion = getGeminiApiVersion();
  const cleanedPdfBase64 = pdfBase64?.replace(
    /^data:application\/pdf;base64,/,
    "",
  );
  const parts: Array<Record<string, unknown>> = [
    {
      text: prompt,
    },
  ];

  if (cleanedPdfBase64) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: cleanedPdfBase64,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API returned non-OK response", {
      apiVersion,
      model,
      status: response.status,
      details: errorText,
    });
    const message =
      response.status === 404
        ? `AI API error: 404. Gemini model '${model}' was not found for API version '${apiVersion}'. Check GEMINI_MODEL and GEMINI_API_VERSION.`
        : `AI API error: ${response.status}`;
    const error = new Error(message);
    Object.assign(error, {
      status: response.status,
      details: errorText,
      source: "gemini",
    });
    throw error;
  }

  const data = await response.json();
  const memo = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!memo) {
    throw new Error("No memo generated from AI");
  }

  return memo;
};
