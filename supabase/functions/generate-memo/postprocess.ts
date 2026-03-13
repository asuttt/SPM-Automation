import { placeholderSpan } from "./constants.ts";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const wrappedPlaceholderPattern = /<span\b[^>]*>\s*(?:XXXXX|--)\s*<\/span>/gi;

export const postProcessMemo = (memo: string) => {
  const protectedToken = "__PLACEHOLDER__";
  let safeMemo = memo.replaceAll(placeholderSpan, protectedToken);

  safeMemo = safeMemo.replace(wrappedPlaceholderPattern, placeholderSpan);
  safeMemo = safeMemo.replace(/XXXXX/g, placeholderSpan);
  safeMemo = safeMemo.replaceAll(protectedToken, placeholderSpan);
  safeMemo = safeMemo.replace(/--/g, placeholderSpan);
  safeMemo = safeMemo.replace(/as described herein/gi, "as described in the POS");
  safeMemo = safeMemo.replace(/\bherein\b/gi, "in the POS");

  const repeatedPlaceholderPattern = new RegExp(
    `(?:${escapeRegExp(placeholderSpan)}\\s*(?:<br>\\s*)?){2,}`,
    "g",
  );

  return safeMemo.replace(repeatedPlaceholderPattern, placeholderSpan);
};
