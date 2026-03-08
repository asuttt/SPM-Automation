import { placeholderSpan } from "./constants.ts";

export const postProcessMemo = (memo: string) => {
  const protectedToken = "__RED_PLACEHOLDER__";
  let safeMemo = memo.replaceAll(placeholderSpan, protectedToken);

  safeMemo = safeMemo.replace(/XXXXX/g, placeholderSpan);
  safeMemo = safeMemo.replaceAll(protectedToken, placeholderSpan);
  safeMemo = safeMemo.replace(/--/g, placeholderSpan);
  safeMemo = safeMemo.replace(/as described herein/gi, "as described in the POS");
  safeMemo = safeMemo.replace(/\bherein\b/gi, "in the POS");

  return safeMemo.replace(
    /(?:<span style="color: red; font-weight: bold;">XXXXX<\/span>\s*(?:<br>\s*)?){2,}/g,
    placeholderSpan,
  );
};
