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

interface GeminiInlineAttachment {
  mimeType: string;
  data: string;
}

const extractTextCandidate = (data: Record<string, unknown>) => {
  const parts = (
    data.candidates as Array<Record<string, unknown>> | undefined
  )?.[0]?.content as Record<string, unknown> | undefined;

  const text = (parts?.parts as Array<Record<string, unknown>> | undefined)
    ?.map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return text;
};

const callGemini = async (
  prompt: string,
  attachments: GeminiInlineAttachment[] = [],
  responseMimeType?: string,
) => {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const apiVersion = getGeminiApiVersion();
  const parts: Array<Record<string, unknown>> = [
    {
      text: prompt,
    },
  ];

  attachments.forEach((attachment) => {
    if (!attachment.data || !attachment.mimeType) {
      return;
    }

    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data,
      },
    });
  });

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
        generationConfig: responseMimeType
          ? {
              responseMimeType,
            }
          : undefined,
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
  const text = extractTextCandidate(data);

  if (!text) {
    throw new Error("No response generated from AI");
  }

  return text;
};

const extractJsonPayload = (value: string) =>
  value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

export const generateMemoWithGemini = async (
  prompt: string,
  pdfBase64?: string,
) =>
  callGemini(
    prompt,
    pdfBase64
      ? [
          {
            mimeType: "application/pdf",
            data: pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
          },
        ]
      : [],
  );

export const generateJsonWithGemini = async <T>(
  prompt: string,
  attachments: GeminiInlineAttachment[] = [],
) => {
  const text = await callGemini(prompt, attachments, "application/json");

  return JSON.parse(extractJsonPayload(text)) as T;
};
