import type { MaturitySchedule, MemoSectionKind } from "@/types/generateMemo";
import { normalizeSeriesDisplayLabel } from "@/lib/seriesDisplay";

const STARRED_SECTION_KINDS = new Set<MemoSectionKind>([
  "schedule",
  "tax_exemptions",
  "maturity_schedule",
]);

const stripHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const formatSeriesDisplayName = (value: string) => {
  return normalizeSeriesDisplayLabel(value);
};

export const getSeriesDisplayNames = (schedule?: MaturitySchedule) =>
  schedule?.series.map((series) => formatSeriesDisplayName(series.seriesName)) ?? [];

export const extractSeriesDisplayNamesFromIssuerSectionHtml = (html: string) => {
  if (!html.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<section>${html}</section>`, "text/html");
  const table = doc.querySelector("table");

  if (!table) {
    return [];
  }

  return Array.from(table.querySelectorAll("td"))
    .map((cell) => cell.innerHTML.replace(/<br\s*\/?>/gi, "\n"))
    .map(stripHtml)
    .map((text) => text.match(/(?:Series\s+)?(\d{4}\s*[A-Z]+)/i)?.[1] ?? "")
    .map((label) => formatSeriesDisplayName(label))
    .filter(Boolean);
};

const parseSeriesDisplayName = (value: string) => {
  const normalized = formatSeriesDisplayName(value);
  const match = normalized.match(/^(\d{4})(?:\s*([A-Z]+))?$/i);

  if (!match) {
    return null;
  }

  return {
    normalized,
    year: match[1],
    suffix: (match[2] ?? "").toUpperCase(),
  };
};

const pickMoreSpecificSeriesDisplayName = (
  preferredLabel?: string,
  fallbackLabel?: string,
) => {
  const normalizedPreferred = preferredLabel ? formatSeriesDisplayName(preferredLabel) : "";
  const normalizedFallback = fallbackLabel ? formatSeriesDisplayName(fallbackLabel) : "";

  if (!normalizedPreferred) {
    return normalizedFallback;
  }

  if (!normalizedFallback) {
    return normalizedPreferred;
  }

  const preferredParts = parseSeriesDisplayName(normalizedPreferred);
  const fallbackParts = parseSeriesDisplayName(normalizedFallback);

  if (
    preferredParts &&
    fallbackParts &&
    preferredParts.year === fallbackParts.year &&
    fallbackParts.suffix.length > preferredParts.suffix.length
  ) {
    return normalizedFallback;
  }

  return normalizedPreferred;
};

export const reconcileSeriesDisplayNames = (
  preferredLabels: string[] = [],
  fallbackLabels: string[] = [],
) => {
  if (preferredLabels.length === 0) {
    return fallbackLabels.map((label) => formatSeriesDisplayName(label)).filter(Boolean);
  }

  if (fallbackLabels.length === 0) {
    return preferredLabels.map((label) => formatSeriesDisplayName(label)).filter(Boolean);
  }

  return preferredLabels
    .map((label, index) => pickMoreSpecificSeriesDisplayName(label, fallbackLabels[index]))
    .filter(Boolean);
};

export const sanitizeSyndicateSectionHtml = (html: string) => {
  return html
    .replace(/\s*,\s*[“"]?left lead[”"]?/gi, "")
    .replace(/\s*\(\s*[“"]?left lead[”"]?\s*\)/gi, "")
    .replace(/\s*\[\s*[“"]?left lead[”"]?\s*\]/gi, "")
    .replace(/\s+[“"]left lead[”"]/gi, "");
};

export const decorateSectionHeadingHtml = (
  html: string,
  kind: MemoSectionKind,
) => {
  if (!STARRED_SECTION_KINDS.has(kind)) {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<section>${html}</section>`, "text/html");
  const heading = doc.querySelector("p");
  const strong = heading?.querySelector("strong");

  if (!strong) {
    return html;
  }

  const text = strong.textContent?.trim() ?? "";
  const normalized = text.replace(/\*$/, "");

  if (!normalized.endsWith(":")) {
    return html;
  }

  strong.textContent = `${normalized.slice(0, -1)}*:`;

  return doc.body.firstElementChild?.innerHTML ?? html;
};

export const rewriteTaxExemptionsTableHtml = (
  html: string,
  seriesDisplayNames: string[] = [],
) => {
  if (seriesDisplayNames.length === 0) {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<section>${html}</section>`, "text/html");
  const table = doc.querySelector("table");

  if (!table) {
    return html;
  }

  const headerRow = table.querySelector("tr");
  if (!headerRow) {
    return html;
  }

  const headerCells = Array.from(headerRow.children).slice(1);

  headerCells.forEach((cell, index) => {
    const label = seriesDisplayNames[index];

    if (label) {
      cell.innerHTML = `<strong>${label}</strong>`;
    }
  });

  return doc.body.firstElementChild?.innerHTML ?? html;
};

export const rewriteHtmlWithSectionTitleStar = (
  html: string,
  kind: MemoSectionKind,
) => decorateSectionHeadingHtml(html, kind);

export const stripMemoHtml = (value: string) =>
  stripHtml(value);
