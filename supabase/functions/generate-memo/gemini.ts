const GEMINI_MODEL = "gemini-2.0-flash-lite";

const getGeminiApiKey = () => {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  return apiKey;
};

export const generateMemoWithGemini = async (
  prompt: string,
  pdfBase64: string,
) => {
  const apiKey = getGeminiApiKey();
  const cleanedPdfBase64 = pdfBase64.replace(
    /^data:application\/pdf;base64,/,
    "",
  );

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: cleanedPdfBase64,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`AI API error: ${response.status}`);
    Object.assign(error, {
      status: response.status,
      details: errorText,
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
