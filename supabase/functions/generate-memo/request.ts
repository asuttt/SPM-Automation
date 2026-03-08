import { type GenerateMemoRequest } from "./types.ts";

class RequestValidationError extends Error {
  status = 400;
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const parseGenerateMemoRequest = (
  body: unknown,
): GenerateMemoRequest => {
  if (!body || typeof body !== "object") {
    throw new RequestValidationError("Request body must be a JSON object");
  }

  const record = body as Record<string, unknown>;
  const pdfBase64 = normalizeString(record.pdfBase64);

  if (!pdfBase64) {
    throw new RequestValidationError("PDF file is required");
  }

  const optionalSections = isStringArray(record.optionalSections)
    ? record.optionalSections
    : [];

  const rawScheduleOverrides =
    record.scheduleOverrides &&
    typeof record.scheduleOverrides === "object" &&
    !Array.isArray(record.scheduleOverrides)
      ? (record.scheduleOverrides as Record<string, unknown>)
      : {};

  return {
    pdfBase64,
    optionalSections,
    scheduleOverrides: {
      posMail: normalizeString(rawScheduleOverrides.posMail),
      pricing: normalizeString(rawScheduleOverrides.pricing),
      closing: normalizeString(rawScheduleOverrides.closing),
    },
  };
};
