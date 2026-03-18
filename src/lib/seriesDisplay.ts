export const normalizeSeriesDisplayLabel = (value: string) => {
  const cleaned = value
    .replace(/^\s*Series\b[\s,]*/i, "")
    .replace(/\bBonds\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const match = cleaned.match(/^(\d{4})(\s*)([A-Z]+)$/i);

  if (!match) {
    return cleaned;
  }

  const [, year, spacing, suffix] = match;
  return `${year}${spacing ? " " : ""}${suffix.toUpperCase()}`;
};
