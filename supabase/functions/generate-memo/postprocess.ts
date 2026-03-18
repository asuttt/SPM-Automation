import { placeholderSpan } from "./constants.ts";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const wrappedPlaceholderPattern = /<span\b[^>]*>\s*(?:XXXXX|--)\s*<\/span>/gi;

const stripHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitSyndicateLines = (value: string) =>
  value
    .replace(/^\s*<br\s*\/?>/i, "")
    .split(/<br\s*\/?>/i)
    .map((line) => line.trim())
    .filter((line) => stripHtml(line).length > 0);

const buildSyndicateParagraph = (label: string, lines: string[]) => {
  if (lines.length === 0) {
    return "";
  }

  if (lines.length === 1) {
    return `<p><strong>${label}:</strong> ${lines[0]}</p>`;
  }

  return `<p><strong>${label}:</strong><br>${lines.join("<br>")}</p>`;
};

const normalizeSyndicateHierarchy = (memo: string) => {
  const coSeniorPattern =
    /<p\b[^>]*>\s*<strong>CO-SENIOR:<\/strong>([\s\S]*?)<\/p>/i;
  const coManagerPattern =
    /<p\b[^>]*>\s*<strong>CO-MANAGER(?:\(S\))?:<\/strong>([\s\S]*?)<\/p>/i;

  const coSeniorMatch = memo.match(coSeniorPattern);

  if (!coSeniorMatch) {
    return memo;
  }

  const coManagerMatch = memo.match(coManagerPattern);
  const coSeniorLines = splitSyndicateLines(coSeniorMatch[1] ?? "");
  const coManagerLines = coManagerMatch
    ? splitSyndicateLines(coManagerMatch[1] ?? "")
    : [];

  if (coSeniorLines.length <= 1 || coManagerLines.length > 0) {
    return memo;
  }

  const nextCoSeniorParagraph = buildSyndicateParagraph("CO-SENIOR", [coSeniorLines[0]]);
  const nextCoManagerParagraph = buildSyndicateParagraph(
    "CO-MANAGER",
    coSeniorLines.slice(1),
  );

  return memo.replace(
    coSeniorPattern,
    `${nextCoSeniorParagraph}${nextCoManagerParagraph}`,
  );
};

export const postProcessMemo = (memo: string) => {
  const protectedToken = "__PLACEHOLDER__";
  let safeMemo = memo.replaceAll(placeholderSpan, protectedToken);

  safeMemo = safeMemo.replace(wrappedPlaceholderPattern, placeholderSpan);
  safeMemo = safeMemo.replace(/XXXXX/g, placeholderSpan);
  safeMemo = safeMemo.replaceAll(protectedToken, placeholderSpan);
  safeMemo = safeMemo.replace(/--/g, placeholderSpan);
  safeMemo = safeMemo.replace(/as described herein/gi, "as described in the POS");
  safeMemo = safeMemo.replace(/\bherein\b/gi, "in the POS");
  safeMemo = safeMemo.replace(/\s*,\s*[“"]?left lead[”"]?/gi, "");
  safeMemo = safeMemo.replace(/\s*\(\s*[“"]?left lead[”"]?\s*\)/gi, "");
  safeMemo = safeMemo.replace(/\s*\[\s*[“"]?left lead[”"]?\s*\]/gi, "");
  safeMemo = safeMemo.replace(/\s+[“"]left lead[”"]/gi, "");

  const repeatedPlaceholderPattern = new RegExp(
    `(?:${escapeRegExp(placeholderSpan)}\\s*(?:<br>\\s*)?){2,}`,
    "g",
  );

  safeMemo = safeMemo.replace(repeatedPlaceholderPattern, placeholderSpan);

  return normalizeSyndicateHierarchy(safeMemo);
};
