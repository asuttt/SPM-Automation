import type {
  MaturitySchedule,
  MaturitySeriesSchedule,
  MemoSection,
} from "@/types/generateMemo";
import type {
  ExportBrandingSelection,
  ExportDocument,
  ExportDocumentSection,
  ExportMaturitySeriesTable,
  ExportScheduleOverrides,
  ExportSectionBlock,
} from "@/types/export";
import type { PdfProcessingMetadata } from "@/types/generateMemo";
import {
  reconcileSeriesDisplayNames,
  sanitizeSyndicateSectionHtml,
  decorateSectionHeadingHtml,
  extractSeriesDisplayNamesFromIssuerSectionHtml,
  formatSeriesDisplayName,
  getSeriesDisplayNames,
  rewriteTaxExemptionsTableHtml,
} from "@/lib/export/memoFormatting";
import { formatMaturityDateLabel } from "@/lib/maturityDateFormatting";
import { buildSeriesHeaderSummary } from "@/lib/export/seriesSummary";

const DEFAULT_EXPORT_BRANDING: ExportBrandingSelection = {
  id: "default",
  label: "Default",
};

const MONTH_NUMBER_BY_NAME: Record<string, string> = {
  january: "1",
  february: "2",
  march: "3",
  april: "4",
  may: "5",
  june: "6",
  july: "7",
  august: "8",
  september: "9",
  october: "10",
  november: "11",
  december: "12",
};

const extractMemoHtml = (content: string) => {
  const trimmed = content.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:\s*\w+)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseHtmlFragment = (html: string) => {
  const parser = new DOMParser();
  return parser.parseFromString(`<div>${html}</div>`, "text/html").body
    .firstElementChild as HTMLDivElement;
};

const replaceScheduleLine = (
  html: string,
  label: string,
  value?: string,
) => {
  if (!value) {
    return html;
  }

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(${escapedLabel}:\\s*)(?:<span[^>]*>.*?<\\/span>|[^<]*)`,
    "i",
  );

  return html.replace(pattern, `$1${escapeHtml(value)}`);
};

const formatShortHeaderDate = (value: string) => {
  const trimmed = value.trim();
  const monthDayMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})$/);

  if (monthDayMatch) {
    const monthNumber = MONTH_NUMBER_BY_NAME[monthDayMatch[1].toLowerCase()];

    if (monthNumber) {
      return `${monthNumber}/${monthDayMatch[2]}`;
    }
  }

  return trimmed;
};

const formatParAmountInThousands = (value: string) => {
  const numericValue = Number(value.replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return value.replace(/\$/g, "").trim();
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numericValue / 1000);
};

const getMaturityDateHeading = (series: MaturitySeriesSchedule) =>
  series.dateMode === "header_month_day" && series.headerDateLabel
    ? `Maturity (${formatShortHeaderDate(series.headerDateLabel)})`
    : "Maturity Date";

const createDealIdSection = (dealId: string): MemoSection => ({
  id: "deal-id",
  title: "Deal ID",
  kind: "deal_id",
  html: `<p><strong>DEAL ID:</strong> ${escapeHtml(dealId)}</p>`,
});

const injectDealIdSection = (
  sections: MemoSection[],
  dealId?: string,
) => {
  const sectionsWithoutDealId = sections.filter((section) => section.kind !== "deal_id");

  if (!dealId) {
    return sectionsWithoutDealId;
  }

  const nextDealIdSection = createDealIdSection(dealId);
  const syndicateIndex = sectionsWithoutDealId.findIndex(
    (section) => section.kind === "syndicate",
  );

  if (syndicateIndex === -1) {
    return [...sectionsWithoutDealId, nextDealIdSection];
  }

  return [
    ...sectionsWithoutDealId.slice(0, syndicateIndex),
    nextDealIdSection,
    ...sectionsWithoutDealId.slice(syndicateIndex),
  ];
};

const applySectionOverrides = (
  section: MemoSection,
  scheduleOverrides?: ExportScheduleOverrides,
) => {
  if (section.kind !== "schedule") {
    return section.html;
  }

  let html = section.html;
  html = replaceScheduleLine(html, "POS", scheduleOverrides?.posMail);
  html = replaceScheduleLine(html, "Pricing", scheduleOverrides?.pricing);
  html = replaceScheduleLine(html, "Closing", scheduleOverrides?.closing);
  return html;
};

const buildMaturityGridBlock = (
  maturitySchedule: MaturitySchedule,
  seriesDisplayNames: string[] = [],
): ExportSectionBlock => {
  const tables: ExportMaturitySeriesTable[] = maturitySchedule.series.map((series, index) => ({
    seriesName: series.seriesName,
    displayTitle: seriesDisplayNames[index] ?? formatSeriesDisplayName(series.seriesName),
    dateHeading: getMaturityDateHeading(series),
    amountHeading: "Par ($000)",
    rows: series.rows.map((row) => ({
      dateLabel: formatMaturityDateLabel(row.dateLabel, series.dateMode),
      principalAmount: row.principalAmount,
      principalAmountThousands: formatParAmountInThousands(row.principalAmount),
      isTermBond: Boolean(row.isTermBond),
    })),
  }));

  return {
    type: "maturity_grid",
    tables,
  };
};

const extractBlocksFromHtml = (html: string): ExportSectionBlock[] => {
  const wrapper = parseHtmlFragment(html);
  const blocks: ExportSectionBlock[] = [];

  Array.from(wrapper.children).forEach((child) => {
    if (child instanceof HTMLParagraphElement) {
      blocks.push({
        type: "paragraph",
        html: child.outerHTML,
        text: stripHtml(child.innerHTML),
      });
      return;
    }

    if (child instanceof HTMLTableElement) {
      const rows = Array.from(child.rows).map((row) =>
        Array.from(row.cells).map((cell) => stripHtml(cell.innerHTML)),
      );

      blocks.push({
        type: "table",
        rows,
      });
      return;
    }

    const text = stripHtml(child.innerHTML);

    if (text) {
      blocks.push({
        type: "paragraph",
        html: child.outerHTML,
        text,
      });
    }
  });

  return blocks;
};

const buildSectionHtml = (
  section: MemoSection,
  maturitySchedule?: MaturitySchedule,
  scheduleOverrides?: ExportScheduleOverrides,
  seriesDisplayNames: string[] = [],
) => {
  let html = applySectionOverrides(section, scheduleOverrides);

  if (section.kind === "syndicate") {
    html = sanitizeSyndicateSectionHtml(html);
  }

  if (section.kind === "tax_exemptions" && seriesDisplayNames.length > 0) {
    html = rewriteTaxExemptionsTableHtml(html, seriesDisplayNames);
  }

  return decorateSectionHeadingHtml(html, section.kind);
};

const buildSectionBlocks = (
  section: MemoSection,
  maturitySchedule?: MaturitySchedule,
  scheduleOverrides?: ExportScheduleOverrides,
  seriesDisplayNames: string[] = [],
) => {
  if (section.kind === "maturity_schedule" && maturitySchedule?.series.length) {
    return [buildMaturityGridBlock(maturitySchedule, seriesDisplayNames)];
  }

  const html = buildSectionHtml(
    section,
    maturitySchedule,
    scheduleOverrides,
    seriesDisplayNames,
  );
  return extractBlocksFromHtml(html);
};

const createExportSection = (
  section: MemoSection,
  maturitySchedule?: MaturitySchedule,
  scheduleOverrides?: ExportScheduleOverrides,
  seriesDisplayNames: string[] = [],
): ExportDocumentSection => {
  const html = buildSectionHtml(
    section,
    maturitySchedule,
    scheduleOverrides,
    seriesDisplayNames,
  );
  const blocks = buildSectionBlocks(
    section,
    maturitySchedule,
    scheduleOverrides,
    seriesDisplayNames,
  );
  const text =
    blocks
      .flatMap((block) => {
        if (block.type === "paragraph") {
          return [block.text];
        }

        if (block.type === "table") {
          return block.rows.flat();
        }

        return block.tables.flatMap((table) => [
          table.displayTitle,
          table.dateHeading,
          table.amountHeading,
          ...table.rows.flatMap((row) => [
            row.dateLabel,
            row.principalAmountThousands,
          ]),
        ]);
      })
      .filter(Boolean)
      .join(" ")
      .trim() || stripHtml(html);

  return {
    id: section.id,
    title: section.title,
    kind: section.kind,
    isCompact: section.kind === "ratings" || section.kind === "deal_id",
    html,
    text,
    sourceSection: section,
    blocks,
  };
};

export interface BuildExportDocumentOptions {
  memo: string;
  memoTitleHtml?: string;
  memoSections: MemoSection[];
  maturitySchedule?: MaturitySchedule;
  scheduleOverrides?: ExportScheduleOverrides;
  branding?: ExportBrandingSelection;
  pdfProcessing?: PdfProcessingMetadata;
}

export const buildExportDocument = ({
  memo,
  memoTitleHtml,
  memoSections,
  maturitySchedule,
  scheduleOverrides,
  branding,
  pdfProcessing,
}: BuildExportDocumentOptions): ExportDocument => {
  const titleHtml = memoTitleHtml || extractMemoHtml(memo);
  const titleText = stripHtml(titleHtml);
  const issuerSeriesDisplayNames = extractSeriesDisplayNamesFromIssuerSectionHtml(
    memoSections.find((section) => section.kind === "issuer_series")?.html ?? "",
  );
  const seriesSummary = buildSeriesHeaderSummary({
    sections: memoSections,
    maturitySchedule,
  });
  const seriesDisplayNames = reconcileSeriesDisplayNames(
    getSeriesDisplayNames(maturitySchedule),
    issuerSeriesDisplayNames.length > 0
      ? issuerSeriesDisplayNames
      : seriesSummary.entries.map((entry) => entry.displaySeriesName),
  );
  const sections = injectDealIdSection(
    memoSections,
    scheduleOverrides?.dealId?.trim(),
  ).map((section) =>
    createExportSection(
      section,
      maturitySchedule,
      scheduleOverrides,
      seriesDisplayNames,
    ),
  );

  return {
    version: 1,
    branding: branding ?? DEFAULT_EXPORT_BRANDING,
    title: {
      html: titleHtml,
      text: titleText,
    },
    sections,
    sectionOrder: sections.map((section) => section.id),
    maturitySchedule,
    metadata: {
      generatedAtIso: new Date().toISOString(),
      pdfProcessing,
      scheduleOverrides: scheduleOverrides ?? {},
    },
  };
};
