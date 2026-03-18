import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

import {
  getBrandingRenderHeightInches,
  resolveBranding,
} from "@/lib/export/branding";
import {
  buildSeriesHeaderSummary,
  formatSeriesHeaderSummary,
} from "@/lib/export/seriesSummary";
import type {
  ExportDocument,
  ExportDocumentSection,
  ExportParagraphBlock,
  ExportSectionBlock,
  ExportTableBlock,
} from "@/types/export";

const TWIPS_PER_INCH = 1440;
const PX_PER_INCH = 96;
const DOCX_PAGE_MARGIN_TWIPS = Math.round(0.5 * TWIPS_PER_INCH);
const PLACEHOLDER_MARKER_COLOR = "FF6A1A";
function toTwips(inches: number) {
  return Math.round(inches * TWIPS_PER_INCH);
}

function toPixels(inches: number) {
  return Math.round(inches * PX_PER_INCH);
}

const TEMPLATE_TABLE_WIDTH = toTwips(6);
const TEMPLATE_LEFT_COL_WIDTH = toTwips(2);
const TEMPLATE_RIGHT_COL_WIDTH = toTwips(4);

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};

const TEMPLATE_BORDER = NO_BORDER;

const STARRED_SECTION_KINDS = new Set([
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

const extractLineTextsFromHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const buildDocxFileName = (document: ExportDocument) => {
  const dealId = document.metadata.scheduleOverrides.dealId?.trim();
  const basis = dealId || document.title.text || "Sales Memo";
  return `${sanitizeFileName(basis)}.docx`;
};

const getIssuerSeriesSection = (document: ExportDocument) =>
  document.sections.find((section) => section.kind === "issuer_series");

const extractIssuerName = (document: ExportDocument) => {
  const issuerSeriesSection = getIssuerSeriesSection(document);

  if (!issuerSeriesSection?.html) {
    return "";
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(
    `<section>${issuerSeriesSection.html}</section>`,
    "text/html",
  );
  const paragraph = parsed.querySelector("p");
  return paragraph ? stripHtml(paragraph.innerHTML) : "";
};

const inferImageType = (src: string) => {
  if (src.toLowerCase().endsWith(".jpg") || src.toLowerCase().endsWith(".jpeg")) {
    return "jpg" as const;
  }

  return "png" as const;
};

const loadImageAsset = async (src: string) => {
  const [response, size] = await Promise.all([
    fetch(src),
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      image.src = src;
    }),
  ]);

  if (!response.ok) {
    throw new Error(`Failed to fetch image asset: ${src}`);
  }

  const data = await response.arrayBuffer();
  return {
    data,
    width: size.width,
    height: size.height,
    type: inferImageType(src),
  };
};

const htmlToInlineRuns = (
  html: string,
  style: {
    bold?: boolean;
    italics?: boolean;
    color?: string;
  } = {},
): TextRun[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  if (!root) {
    return [];
  }

  const walk = (
    node: Node,
    inheritedStyle: {
      bold?: boolean;
      italics?: boolean;
      color?: string;
    },
  ): TextRun[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";

      if (!text) {
        return [];
      }

      return [
        new TextRun({
          text,
          bold: inheritedStyle.bold,
          italics: inheritedStyle.italics,
          color: inheritedStyle.color,
          font: "IBM Plex Sans",
        }),
      ];
    }

    if (!(node instanceof HTMLElement)) {
      return [];
    }

    if (node.tagName === "BR") {
      return [new TextRun({ break: 1, font: "IBM Plex Sans" })];
    }

    const nextStyle = {
      ...inheritedStyle,
      bold:
        inheritedStyle.bold ||
        node.tagName === "STRONG" ||
        node.tagName === "B",
      italics:
        inheritedStyle.italics ||
        node.tagName === "EM" ||
        node.tagName === "I",
      color:
        /(?:FF6A1A|XXXXX|color:\s*red)/i.test(node.outerHTML)
          ? PLACEHOLDER_MARKER_COLOR
          : inheritedStyle.color,
    };

    return Array.from(node.childNodes).flatMap((child) => walk(child, nextStyle));
  };

  return Array.from(root.childNodes).flatMap((child) => walk(child, style));
};

const paragraphFromBlock = (
  block: ExportParagraphBlock,
  options: {
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingAfter?: number;
    spacingBefore?: number;
  } = {},
) =>
  new Paragraph({
    alignment: options.alignment,
    spacing: {
      before: options.spacingBefore,
      after: options.spacingAfter ?? 120,
      line: 276,
    },
    children: htmlToInlineRuns(block.html),
  });

const buildTemplateCell = (
  children: readonly (Paragraph | Table)[],
  options: {
    widthTwips: number;
    colSpan?: number;
    verticalAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
  },
) =>
  new TableCell({
    width: {
      size: options.widthTwips,
      type: WidthType.DXA,
    },
    columnSpan: options.colSpan,
    verticalAlign: options.verticalAlign ?? VerticalAlign.TOP,
    margins: options.margins ?? {
      top: 70,
      right: 85,
      bottom: 70,
      left: 85,
    },
    borders: {
      top: TEMPLATE_BORDER,
      bottom: TEMPLATE_BORDER,
      left: TEMPLATE_BORDER,
      right: TEMPLATE_BORDER,
    },
    children,
  });

const buildInlineParagraph = (
  text: string,
  options: {
    bold?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    color?: string;
    size?: number;
    spacingAfter?: number;
    italics?: boolean;
  } = {},
) =>
  new Paragraph({
    alignment: options.alignment,
    spacing: {
      after: options.spacingAfter ?? 40,
      line: 240,
    },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italics,
        color: options.color,
        size: options.size,
        font: "IBM Plex Sans",
      }),
    ],
  });

const formatSectionLabel = (section: ExportDocumentSection) => {
  const title = section.title.toUpperCase();

  if (!STARRED_SECTION_KINDS.has(section.kind)) {
    return `${title}:`;
  }

  return `${title}*:`;
};

const buildSimpleTable = (block: ExportTableBlock) =>
  new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: block.rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: cell,
                        bold: rowIndex === 0,
                        font: "IBM Plex Sans",
                      }),
                    ],
                  }),
                ],
              }),
          ),
        }),
    ),
  });

const buildMaturityGrid = (block: Extract<ExportSectionBlock, { type: "maturity_grid" }>) => {
  const rows = [];

  for (let index = 0; index < block.tables.length; index += 2) {
    const pair = block.tables.slice(index, index + 2);

    rows.push(
      new TableRow({
        children: pair.map(
          (table) =>
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 90 },
                  children: [
                    new TextRun({
                      text: table.displayTitle,
                      bold: true,
                      font: "IBM Plex Sans",
                    }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  layout: TableLayoutType.FIXED,
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  },
                  rows: [
                    new TableRow({
                      children: [table.dateHeading, table.amountHeading].map(
                        (heading) =>
                          new TableCell({
                            borders: {
                              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                              bottom: NO_BORDER,
                            },
                            children: [
                              new Paragraph({
                                spacing: { after: 50 },
                                children: [
                                  new TextRun({
                                    text: heading,
                                    bold: true,
                                    font: "IBM Plex Sans",
                                  }),
                                ],
                              }),
                            ],
                          }),
                      ),
                    }),
                    ...table.rows.map(
                      (row) =>
                        new TableRow({
                          children: [row.dateLabel, row.principalAmountThousands].map(
                            (value, cellIndex) =>
                              new TableCell({
                                borders: {
                                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                },
                                children: [
                                  new Paragraph({
                                    alignment:
                                      cellIndex === 1
                                        ? AlignmentType.RIGHT
                                        : AlignmentType.LEFT,
                                    spacing: { after: 24 },
                                    children: [
                                      new TextRun({
                                        text: value,
                                        font: "IBM Plex Sans",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                          ),
                        }),
                    ),
                  ],
                }),
              ],
            }),
        ),
      }),
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows,
  });
};

const buildCompactLines = (lines: string[]) =>
  lines.map((line, index) =>
    buildInlineParagraph(line, {
      spacingAfter: index === lines.length - 1 ? 0 : 28,
    }),
  );

const buildTaxTableForTemplate = (block: ExportTableBlock) => {
  const rows = block.rows;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: TEMPLATE_BORDER,
      bottom: TEMPLATE_BORDER,
      left: TEMPLATE_BORDER,
      right: TEMPLATE_BORDER,
      insideHorizontal: TEMPLATE_BORDER,
      insideVertical: TEMPLATE_BORDER,
    },
    rows: rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: row.map(
            (value, cellIndex) =>
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 55, bottom: 55, left: 65, right: 65 },
              borders: {
                top: NO_BORDER,
                bottom: NO_BORDER,
                left: NO_BORDER,
                right: NO_BORDER,
              },
              children: [
                new Paragraph({
                  alignment:
                    rowIndex === 0 || cellIndex > 0
                      ? AlignmentType.CENTER
                      : AlignmentType.LEFT,
                    spacing: { after: 0, line: 220 },
                    children: [
                      new TextRun({
                        text: value,
                        bold: rowIndex === 0,
                        font: "IBM Plex Sans",
                      }),
                    ],
                  }),
                ],
              }),
          ),
        }),
    ),
  });
};

const buildScheduleSubtable = (section: ExportDocumentSection) => {
  const lines = extractLineTextsFromHtml(section.html);
  const valueLines = lines.filter((line) => !/^schedule\*?:?$/i.test(line));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: TEMPLATE_BORDER,
      insideVertical: TEMPLATE_BORDER,
    },
    rows: valueLines.map((line, index) => {
      const match = line.match(/^([^:]+:)\s*(.*)$/);
      const label = match?.[1] ?? line;
      const value = match?.[2] ?? "";

      return new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: index === 0 ? NO_BORDER : TEMPLATE_BORDER,
              bottom: NO_BORDER,
              left: NO_BORDER,
              right: TEMPLATE_BORDER,
            },
            margins: { top: 50, bottom: 50, left: 0, right: 55 },
            children: [
              buildInlineParagraph(label, {
                bold: true,
                italics: true,
                spacingAfter: 0,
              }),
            ],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            borders: {
              top: index === 0 ? NO_BORDER : TEMPLATE_BORDER,
              bottom: NO_BORDER,
              left: NO_BORDER,
              right: NO_BORDER,
            },
            margins: { top: 50, bottom: 50, left: 0, right: 0 },
            children: [
              buildInlineParagraph(value, {
                spacingAfter: 0,
                color: /XXXXX/i.test(value) ? PLACEHOLDER_MARKER_COLOR : undefined,
              }),
            ],
          }),
        ],
      });
    }),
  });
};

const buildSyndicateRows = (section: ExportDocumentSection) => {
  const lines = extractLineTextsFromHtml(section.html);
  const rows: { label: string; values: string[] }[] = [];
  let current: { label: string; values: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^([^:]+:)\s*(.*)$/);

    if (match) {
      if (current) {
        rows.push(current);
      }

      current = {
        label: match[1].trim(),
        values: match[2] ? [match[2].trim()] : [],
      };
      continue;
    }

    if (current) {
      current.values.push(line);
    }
  }

  if (current) {
    rows.push(current);
  }

  return rows;
};

const extractInlineValue = (section: ExportDocumentSection) => {
  const text = stripHtml(section.html);
  const match = text.match(/^([^:]+:)\s*(.*)$/);

  return {
    label: match?.[1]?.trim() ?? `${section.title.toUpperCase()}:`,
    value: match?.[2]?.trim() ?? text,
  };
};

const buildBodyContentForSection = (section: ExportDocumentSection): readonly (Paragraph | Table)[] => {
  if (section.kind === "tax_exemptions") {
    const tableBlock = section.blocks.find(
      (block): block is ExportTableBlock => block.type === "table",
    );

    if (tableBlock) {
      return [buildTaxTableForTemplate(tableBlock)];
    }
  }

  if (section.kind === "schedule") {
    return [buildScheduleSubtable(section)];
  }

  if (section.kind === "maturity_schedule") {
    const maturityBlock = section.blocks.find(
      (block): block is Extract<ExportSectionBlock, { type: "maturity_grid" }> =>
        block.type === "maturity_grid",
    );

    if (maturityBlock) {
      return [buildMaturityGrid(maturityBlock)];
    }
  }

  if (section.kind === "ratings" || section.kind === "deal_id") {
    const { value } = extractInlineValue(section);
    return buildCompactLines(value ? [value] : ["XXXXX"]);
  }

  if (section.kind === "syndicate") {
    return buildCompactLines(
      buildSyndicateRows(section).flatMap((row) => row.values.length ? row.values : ["XXXXX"]),
    );
  }

  const paragraphBlocks = section.blocks.filter(
    (block): block is ExportParagraphBlock => block.type === "paragraph",
  );
  const lines = paragraphBlocks
    .map((block) => stripHtml(block.html))
    .filter(Boolean)
    .slice(1);

  return buildCompactLines(lines.length ? lines : [section.text]);
};

const buildBodyRows = (document: ExportDocument) => {
  const sections = document.sections.filter((section) => section.kind !== "issuer_series");
  const rows: TableRow[] = [];

  sections.forEach((section) => {
    if (section.kind === "syndicate") {
      const syndicateRows = buildSyndicateRows(section);
      syndicateRows.forEach((row) => {
        rows.push(
          new TableRow({
            children: [
              buildTemplateCell(
                [buildInlineParagraph(row.label, { bold: true, spacingAfter: 0 })],
                { widthTwips: TEMPLATE_LEFT_COL_WIDTH },
              ),
              buildTemplateCell(buildCompactLines(row.values.length ? row.values : ["XXXXX"]), {
                widthTwips: TEMPLATE_RIGHT_COL_WIDTH,
              }),
            ],
          }),
        );
      });
      return;
    }

    const label =
      section.kind === "ratings" || section.kind === "deal_id"
        ? extractInlineValue(section).label
        : formatSectionLabel(section);

    rows.push(
      new TableRow({
        children: [
          buildTemplateCell(
            [buildInlineParagraph(label, { bold: true, spacingAfter: 0 })],
            { widthTwips: TEMPLATE_LEFT_COL_WIDTH },
          ),
          buildTemplateCell(buildBodyContentForSection(section), {
            widthTwips: TEMPLATE_RIGHT_COL_WIDTH,
          }),
        ],
      }),
    );
  });

  return rows;
};

const buildMainBodyTable = (document: ExportDocument) =>
  new Table({
    width: {
      size: TEMPLATE_TABLE_WIDTH,
      type: WidthType.DXA,
    },
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.FIXED,
    borders: {
      top: TEMPLATE_BORDER,
      bottom: TEMPLATE_BORDER,
      left: TEMPLATE_BORDER,
      right: TEMPLATE_BORDER,
      insideHorizontal: TEMPLATE_BORDER,
      insideVertical: TEMPLATE_BORDER,
    },
    rows: buildBodyRows(document),
  });

const buildCoverSummaryTable = (document: ExportDocument) => {
  const summary = buildSeriesHeaderSummary(document);
  const issuerName = extractIssuerName(document) || "[Issuer Name]";
  const topAmount =
    summary.totalParAmount > 0 && summary.entries.length > 1
      ? summary.totalParAmountDisplay
      : "";

  const rows: TableRow[] = [
    new TableRow({
      children: [
        buildTemplateCell(
          [
            ...(topAmount
              ? [
                  buildInlineParagraph(topAmount, {
                    bold: false,
                    alignment: AlignmentType.CENTER,
                    color: /\bXXX\b/i.test(topAmount) ? PLACEHOLDER_MARKER_COLOR : undefined,
                    size: 28,
                    spacingAfter: 40,
                  }),
                ]
              : []),
            buildInlineParagraph(issuerName, {
              alignment: AlignmentType.CENTER,
              size: 28,
              spacingAfter: 0,
              color: /\[.*\]/.test(issuerName) ? PLACEHOLDER_MARKER_COLOR : undefined,
            }),
          ],
          {
            widthTwips: TEMPLATE_TABLE_WIDTH,
            colSpan: 2,
            margins: { top: 120, right: 120, bottom: 120, left: 120 },
          },
        ),
      ],
    }),
  ];

  if (summary.entries.length === 2) {
    rows.push(
      new TableRow({
        children: summary.entries.map((entry) =>
          buildTemplateCell(
            [
              buildInlineParagraph(entry.totalParAmountDisplay, {
                alignment: AlignmentType.CENTER,
                color:
                  /\bXXX\b/i.test(entry.totalParAmountDisplay)
                    ? PLACEHOLDER_MARKER_COLOR
                    : undefined,
                size: 28,
                spacingAfter: 40,
              }),
              buildInlineParagraph(`${entry.descriptor ? `${entry.descriptor}, ` : ""}Series ${entry.displaySeriesName}`, {
                alignment: AlignmentType.CENTER,
                size: 28,
                spacingAfter: 0,
                color: /\[.*\]/.test(entry.displaySeriesName) ? PLACEHOLDER_MARKER_COLOR : undefined,
              }),
            ],
            {
              widthTwips: TEMPLATE_TABLE_WIDTH / 2,
              margins: { top: 100, right: 100, bottom: 100, left: 100 },
            },
          ),
        ),
      }),
    );
  } else if (summary.lines.length > 0) {
    rows.push(
      new TableRow({
        children: [
          buildTemplateCell(
            summary.lines.map((line) =>
              buildInlineParagraph(line, {
                alignment: AlignmentType.CENTER,
                size: 28,
                spacingAfter: 0,
              }),
            ),
            {
              widthTwips: TEMPLATE_TABLE_WIDTH,
              colSpan: 2,
              margins: { top: 100, right: 100, bottom: 100, left: 100 },
            },
          ),
        ],
      }),
    );
  }

  return new Table({
    width: {
      size: TEMPLATE_TABLE_WIDTH,
      type: WidthType.DXA,
    },
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.FIXED,
    borders: {
      top: TEMPLATE_BORDER,
      bottom: TEMPLATE_BORDER,
      left: TEMPLATE_BORDER,
      right: TEMPLATE_BORDER,
      insideHorizontal: TEMPLATE_BORDER,
      insideVertical: TEMPLATE_BORDER,
    },
    rows,
  });
};

const buildSectionChildren = (section: ExportDocumentSection) =>
  section.blocks.flatMap((block) => {
    if (block.type === "paragraph") {
      return [
        paragraphFromBlock(block, {
          spacingAfter: section.isCompact ? 60 : 120,
        }),
      ];
    }

    if (block.type === "table") {
      return [buildSimpleTable(block)];
    }

    return [buildMaturityGrid(block)];
  });

const buildTitleChildren = (document: ExportDocument) => {
  const parser = new DOMParser();
  const titleDoc = parser.parseFromString(`<div>${document.title.html}</div>`, "text/html");
  const root = titleDoc.body.firstElementChild;

  if (!root) {
    return [];
  }

  return Array.from(root.children).flatMap((child, index) => {
    if (child instanceof HTMLParagraphElement) {
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            before: index === 0 ? 60 : 0,
            after: 80,
            line: 276,
          },
          children: htmlToInlineRuns(child.outerHTML),
        }),
      ];
    }

    if (child instanceof HTMLTableElement) {
      const rows = Array.from(child.rows).map((row) =>
        row.cells.length === 1
          ? new TableRow({
              children: [
                new TableCell({
                  columnSpan: 2,
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 60 },
                      children: htmlToInlineRuns(row.cells[0].innerHTML),
                    }),
                  ],
                }),
              ],
            })
          : new TableRow({
              children: Array.from(row.cells).map(
                (cell) =>
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 60 },
                        children: htmlToInlineRuns(cell.innerHTML),
                      }),
                    ],
                  }),
              ),
            }),
      );

      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          rows,
        }),
      ];
    }

    const text = stripHtml(child.innerHTML);

    if (!text) {
      return [];
    }

    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: htmlToInlineRuns(child.outerHTML),
      }),
    ];
  });
};

const buildFirstPageHeader = async (document: ExportDocument) => {
  const branding = resolveBranding(document.branding.id);

  if (!branding.logoSrc) {
    return new Header({
      children: [new Paragraph({ spacing: { after: 0 } })],
    });
  }

  const image = await loadImageAsset(branding.logoSrc);
  const targetHeight = toPixels(getBrandingRenderHeightInches(branding));
  const targetWidth = Math.round((image.width / image.height) * targetHeight);

  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40 },
        children: [
          new ImageRun({
            data: image.data,
            type: image.type,
            transformation: {
              width: targetWidth,
              height: targetHeight,
            },
          }),
        ],
      }),
    ],
  });
};

const buildLaterPageHeader = (document: ExportDocument) => {
  const summary = buildSeriesHeaderSummary(document);
  const lines = formatSeriesHeaderSummary(summary)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return new Header({
    children:
      lines.length > 0
        ? lines.map(
            (line) =>
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: line,
                    font: "IBM Plex Sans",
                    size: 20,
                    color: "262626",
                  }),
                ],
              }),
          )
        : [new Paragraph({ spacing: { after: 0 } })],
  });
};

const buildFooter = () =>
  new Footer({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: {
          top: NO_BORDER,
          bottom: NO_BORDER,
          left: NO_BORDER,
          right: NO_BORDER,
          insideHorizontal: NO_BORDER,
          insideVertical: NO_BORDER,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 80, type: WidthType.PERCENTAGE },
                borders: {
                  top: NO_BORDER,
                  bottom: NO_BORDER,
                  left: NO_BORDER,
                  right: NO_BORDER,
                },
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                children: [
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      new TextRun({
                        text: "*Preliminary, subject to change when, as, and if issued",
                        font: "IBM Plex Sans",
                        size: 18,
                        color: "262626",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                borders: {
                  top: NO_BORDER,
                  bottom: NO_BORDER,
                  left: NO_BORDER,
                  right: NO_BORDER,
                },
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 0 },
                    children: [
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        font: "IBM Plex Sans",
                        size: 18,
                        color: "262626",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

const buildDocumentChildren = (document: ExportDocument) => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 180, line: 240 },
    children: [
      new TextRun({
        text: document.title.text || "Sales Point Memorandum",
        bold: true,
        size: 48,
        font: "IBM Plex Sans",
      }),
    ],
  }),
  buildCoverSummaryTable(document),
  new Paragraph({ spacing: { after: 120 } }),
  buildMainBodyTable(document),
];

export const buildDocxBlob = async (document: ExportDocument) => {
  const [firstHeader, defaultHeader] = await Promise.all([
    buildFirstPageHeader(document),
    Promise.resolve(buildLaterPageHeader(document)),
  ]);
  const firstFooter = buildFooter();
  const defaultFooter = buildFooter();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "IBM Plex Sans",
            size: 22,
          },
          paragraph: {
            spacing: {
              after: 120,
              line: 276,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            margin: {
              top: DOCX_PAGE_MARGIN_TWIPS,
              right: DOCX_PAGE_MARGIN_TWIPS,
              bottom: DOCX_PAGE_MARGIN_TWIPS,
              left: DOCX_PAGE_MARGIN_TWIPS,
            },
          },
        },
        headers: {
          first: firstHeader,
          default: defaultHeader,
        },
        footers: {
          first: firstFooter,
          default: defaultFooter,
        },
        children: buildDocumentChildren(document),
      },
    ],
  });

  return Packer.toBlob(doc);
};

export const downloadDocx = async (document: ExportDocument) => {
  const blob = await buildDocxBlob(document);
  const fileName = buildDocxFileName(document);
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
};
