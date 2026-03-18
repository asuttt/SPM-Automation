import type {
  ExportDocument,
  ExportDocumentSection,
} from "@/types/export";
import { formatSeriesDisplayName } from "@/lib/export/memoFormatting";

export interface SeriesHeaderSummaryEntry {
  seriesName: string;
  displaySeriesName: string;
  descriptor: string;
  totalParAmount: number;
  totalParAmountDisplay: string;
}

export interface SeriesHeaderSummary {
  mode: "empty" | "single" | "pair" | "consolidated";
  lines: string[];
  entries: SeriesHeaderSummaryEntry[];
  totalParAmount: number;
  totalParAmountDisplay: string;
  consolidatedSeriesToken?: string;
  consolidatedDescriptor?: string;
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const stripSeriesWord = (value: string) =>
  value.replace(/\bSeries\s+/gi, "").replace(/\s+/g, " ").trim();

const normalizeText = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseMoneyValue = (value: string) => {
  const numericValue = Number(value.replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round(numericValue);
};

const formatMoneyValue = (value: number) =>
  `$${moneyFormatter.format(Math.max(0, value))}`;

const formatMoneyValueWithAsterisk = (value: number) =>
  `${formatMoneyValue(value)}*`;

const sumSeriesAmount = (series: { rows: { principalAmount: string }[] }) =>
  series.rows.reduce(
    (total, row) => total + parseMoneyValue(row.principalAmount),
    0,
  );

const normalizeSeriesName = (value: string) => stripSeriesWord(value);

const condenseSeriesToken = (seriesNames: string[]) => {
  if (seriesNames.length === 0) {
    return "";
  }

  const normalized = seriesNames
    .map(normalizeSeriesName)
    .map((seriesName) => seriesName.replace(/\s+/g, ""));
  const pattern = normalized[0]?.match(/^(\d{4})([A-Z]+)$/i);

  if (!pattern) {
    return normalized.join("/");
  }

  const [_, prefix] = pattern;
  const suffixes = normalized
    .map((seriesName) => seriesName.match(/^\d{4}([A-Z]+)$/i)?.[1] ?? "")
    .filter(Boolean);

  if (suffixes.length !== normalized.length) {
    return normalized.join("/");
  }

  return `${prefix}${suffixes.join("")}`;
};

const canonicalizeDescriptor = (descriptor: string) => {
  const normalized = descriptor.replace(/\s+/g, " ").trim();
  const lowered = normalized.toLowerCase();

  if (lowered.includes("revenue refunding")) {
    return "Revenue Refunding Bonds";
  }

  if (lowered.includes("refunding revenue")) {
    return "Revenue Refunding Bonds";
  }

  if (lowered.includes("revenue bonds")) {
    return "Revenue Bonds";
  }

  if (lowered.includes("refunding bonds")) {
    return "Refunding Bonds";
  }

  if (lowered.endsWith("bonds")) {
    return normalized;
  }

  if (normalized) {
    return `${normalized} Bonds`;
  }

  return "";
};

const mergeDescriptors = (descriptors: string[]) => {
  const uniqueDescriptors = Array.from(
    new Set(
      descriptors
        .map(canonicalizeDescriptor)
        .map((descriptor) => descriptor.trim())
        .filter(Boolean),
    ),
  );

  if (uniqueDescriptors.length === 0) {
    return "";
  }

  if (uniqueDescriptors.length === 1) {
    return uniqueDescriptors[0];
  }

  const reduced = uniqueDescriptors.map((descriptor) =>
    descriptor.replace(/\bBonds\b$/i, "").trim(),
  );

  return `${reduced.join(" and ")} Bonds`;
};

const extractDescriptorFromWindow = (windowText: string) => {
  const cleaned = normalizeText(windowText)
    .replace(/\$[\d,]+(?:\.\d+)?\*?/g, " ")
    .replace(/[\[\]()*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const keywordCandidates = [
    "Revenue Refunding Bonds",
    "Refunding Revenue Bonds",
    "Revenue Bonds",
    "Refunding Bonds",
    "Bonds",
  ];

  const lowered = cleaned.toLowerCase();
  for (const candidate of keywordCandidates) {
    if (lowered.includes(candidate.toLowerCase())) {
      return canonicalizeDescriptor(candidate);
    }
  }

  const trailingMatch = cleaned.match(/([A-Za-z][A-Za-z\s/&-]{2,})$/);

  if (trailingMatch) {
    return canonicalizeDescriptor(trailingMatch[1]);
  }

  return "";
};

const extractIssuerSeriesText = (section?: ExportDocumentSection) => {
  if (!section) {
    return "";
  }

  return normalizeText([section.text, section.html].filter(Boolean).join(" "));
};

const extractIssuerSeriesEntriesFromHtml = (section?: ExportDocumentSection) => {
  if (!section?.html) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<section>${section.html}</section>`, "text/html");
  const table = doc.querySelector("table");

  if (!table) {
    return [];
  }

  return Array.from(table.querySelectorAll("td"))
    .map((cell) => cell.innerHTML)
    .map((html) => html.replace(/<br\s*\/?>/gi, "\n"))
    .map((html) => normalizeText(html))
    .filter(Boolean)
    .map((text) => {
      const moneyMatch = text.match(/\$[\d,]+(?:\.\d+)?/);
      const seriesMatch = text.match(/(?:Series\s+)?(\d{4}\s*[A-Z]+)/i);

      if (!moneyMatch || !seriesMatch) {
        return null;
      }

      const amount = parseMoneyValue(moneyMatch[0]);
      const displaySeriesName = formatSeriesDisplayName(seriesMatch[1]);
      const descriptorText = text
        .replace(moneyMatch[0], " ")
        .replace(seriesMatch[0], " ")
        .replace(/\*/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return {
        seriesName: `Series ${displaySeriesName}`,
        displaySeriesName,
        descriptor: canonicalizeDescriptor(descriptorText),
        totalParAmount: amount,
        totalParAmountDisplay: formatMoneyValueWithAsterisk(amount),
      };
    })
    .filter((entry): entry is SeriesHeaderSummaryEntry => Boolean(entry));
};

const inferDescriptorForSeries = (
  issuerSeriesText: string,
  seriesName: string,
) => {
  if (!issuerSeriesText) {
    return "";
  }

  const searchText = issuerSeriesText.toLowerCase();
  const searchName = normalizeSeriesName(seriesName).toLowerCase();
  const index = searchText.indexOf(searchName);

  if (index === -1) {
    return "";
  }

  const windowStart = Math.max(0, index - 160);
  const windowText = issuerSeriesText.slice(windowStart, index);
  return extractDescriptorFromWindow(windowText);
};

const buildSeriesEntries = (
  document: Pick<ExportDocument, "sections" | "maturitySchedule">,
) => {
  const maturitySchedule = document.maturitySchedule;
  const issuerSeriesSection = document.sections.find(
    (section) => section.kind === "issuer_series",
  );
  const issuerSeriesText = extractIssuerSeriesText(issuerSeriesSection);
  const issuerSeriesEntries = extractIssuerSeriesEntriesFromHtml(issuerSeriesSection);

  if (issuerSeriesEntries.length > 0) {
    return issuerSeriesEntries.map((entry) => ({
      ...entry,
      displaySeriesName: formatSeriesDisplayName(entry.seriesName),
    }));
  }

  if (!maturitySchedule?.series.length) {
    return [];
  }

  const scheduleEntries = maturitySchedule.series.map((series) => {
    const totalParAmount = sumSeriesAmount(series);
    return {
      seriesName: series.seriesName,
      displaySeriesName: formatSeriesDisplayName(series.seriesName),
      descriptor:
        inferDescriptorForSeries(issuerSeriesText, series.seriesName) || "",
      totalParAmount,
      totalParAmountDisplay: formatMoneyValueWithAsterisk(totalParAmount),
    };
  });

  return scheduleEntries.length > 0 ? scheduleEntries : issuerSeriesEntries;
};

const formatEntryLine = (entry: SeriesHeaderSummaryEntry) => {
  const descriptor = entry.descriptor ? `${entry.descriptor}, ` : "";
  return `${entry.totalParAmountDisplay} ${descriptor}Series ${entry.displaySeriesName}`;
};

export const buildSeriesHeaderSummary = (
  document: Pick<ExportDocument, "sections" | "maturitySchedule">,
): SeriesHeaderSummary => {
  const entries = buildSeriesEntries(document);

  if (entries.length === 0) {
    return {
      mode: "empty",
      lines: [],
      entries,
      totalParAmount: 0,
      totalParAmountDisplay: formatMoneyValueWithAsterisk(0),
    };
  }

  const totalParAmount = entries.reduce(
    (total, entry) => total + entry.totalParAmount,
    0,
  );
  const totalParAmountDisplay = formatMoneyValueWithAsterisk(totalParAmount);

  if (entries.length === 1) {
    return {
      mode: "single",
      lines: [formatEntryLine(entries[0])],
      entries,
      totalParAmount,
      totalParAmountDisplay,
    };
  }

  if (entries.length === 2) {
    return {
      mode: "pair",
      lines: entries.map(formatEntryLine),
      entries,
      totalParAmount,
      totalParAmountDisplay,
    };
  }

  const consolidatedSeriesToken = condenseSeriesToken(
    entries.map((entry) => entry.displaySeriesName),
  );
  const consolidatedDescriptor = mergeDescriptors(
    entries.map((entry) => entry.descriptor),
  );
  const consolidatedLabel = consolidatedDescriptor
    ? `${consolidatedDescriptor}, Series ${consolidatedSeriesToken}`
    : `Series ${consolidatedSeriesToken}`;

  return {
    mode: "consolidated",
    lines: [`${totalParAmountDisplay} ${consolidatedLabel}`],
    entries,
    totalParAmount,
    totalParAmountDisplay,
    consolidatedSeriesToken,
    consolidatedDescriptor,
  };
};

export const formatSeriesHeaderSummary = (summary: SeriesHeaderSummary) =>
  summary.lines.join("\n");

export const formatSeriesHeaderSummaryLine = (
  entry: SeriesHeaderSummaryEntry,
) => formatEntryLine(entry);
