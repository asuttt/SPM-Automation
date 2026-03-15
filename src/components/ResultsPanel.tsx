import { ArrowLeft, Check, Copy, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";

import { MaturityScheduleCapture } from "@/components/MaturityScheduleCapture";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  type MaturitySchedule,
  type MaturityScheduleRow,
  type MaturitySeriesSchedule,
  type MemoSection,
  type PdfProcessingMetadata,
} from "@/types/generateMemo";

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

const stripSeriesWord = (html: string) => html.replace(/\bSeries\s+/gi, "");

const stripSeriesTableTitle = (value: string) =>
  value
    .replace(/\bSeries\b/gi, "")
    .replace(/\bBonds\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

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

const buildTaxTableLayout = (table: HTMLTableElement) => {
  const rows = Array.from(table.querySelectorAll("tr"));

  if (rows.length < 2) {
    return null;
  }

  const headerCells = Array.from(rows[0]?.children ?? []).slice(1);
  const seriesHeaders = headerCells.map((cell) =>
    stripSeriesWord((cell as HTMLElement).innerHTML.trim()),
  );

  if (seriesHeaders.length === 0) {
    return null;
  }

  const valueRows = rows.slice(1).map((row) => {
    const cells = Array.from(row.children);
    return {
      label: (cells[0] as HTMLElement | undefined)?.innerHTML.trim() ?? "",
      values: cells.slice(1).map((cell) => (cell as HTMLElement).innerHTML.trim()),
    };
  });

  const wrapper = document.createElement("div");
  wrapper.className = "memo-tax-table-stack memo-gap-after";

  for (let start = 0; start < seriesHeaders.length; start += 4) {
    const end = start + 4;
    const chunkHeaders = seriesHeaders.slice(start, end);
    const chunkTable = document.createElement("table");
    chunkTable.className = "memo-tax-table";

    const headerRow = document.createElement("tr");
    const spacerHeader = document.createElement("td");
    spacerHeader.innerHTML = "&nbsp;";
    headerRow.appendChild(spacerHeader);

    chunkHeaders.forEach((header) => {
      const cell = document.createElement("td");
      cell.innerHTML = `<strong>${header}</strong>`;
      headerRow.appendChild(cell);
    });

    for (let i = chunkHeaders.length; i < 4; i += 1) {
      const emptyCell = document.createElement("td");
      emptyCell.className = "memo-tax-blank";
      emptyCell.innerHTML = "&nbsp;";
      headerRow.appendChild(emptyCell);
    }

    chunkTable.appendChild(headerRow);

    valueRows.forEach((valueRow) => {
      const row = document.createElement("tr");
      const labelCell = document.createElement("td");
      labelCell.innerHTML = valueRow.label;
      row.appendChild(labelCell);

      valueRow.values.slice(start, end).forEach((value) => {
        const cell = document.createElement("td");
        cell.innerHTML = value;
        row.appendChild(cell);
      });

      for (let i = valueRow.values.slice(start, end).length; i < 4; i += 1) {
        const emptyCell = document.createElement("td");
        emptyCell.className = "memo-tax-blank";
        emptyCell.innerHTML = "&nbsp;";
        row.appendChild(emptyCell);
      }

      chunkTable.appendChild(row);
    });

    wrapper.appendChild(chunkTable);
  }

  return wrapper;
};

const formatTitleMarkup = (content: string) => {
  const wrapper = document.createElement("div");
  wrapper.className = "memo-title-block";
  wrapper.innerHTML = DOMPurify.sanitize(content);
  const firstParagraph = wrapper.querySelector("p");
  firstParagraph?.classList.add("memo-gap-after");
  return wrapper.innerHTML;
};

const cloneMaturitySchedule = (value?: MaturitySchedule) =>
  value ? JSON.parse(JSON.stringify(value)) as MaturitySchedule : undefined;

const createEditableMaturitySchedule = (value?: MaturitySchedule) =>
  value
    ? {
        ...cloneMaturitySchedule(value),
        series: value.series.map((series) => ({
          ...series,
          rows: series.rows.map((row) => ({
            ...row,
            principalAmount: formatParAmountInThousands(row.principalAmount),
          })),
        })),
      }
    : undefined;

const formatFullPrincipalAmount = (value: string) => {
  const numericValue = Number(value.replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(numericValue * 1000));
};

const getMaturityDateHeading = (series: MaturitySeriesSchedule) =>
  series.dateMode === "header_month_day" && series.headerDateLabel
    ? `Maturity (${formatShortHeaderDate(series.headerDateLabel)})`
    : "Maturity Date";

const buildMaturityTableHtml = (series: MaturitySeriesSchedule) => {
  const dateHeading = getMaturityDateHeading(series);
  const rows = series.rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.dateLabel)}</td><td>${escapeHtml(
          formatParAmountInThousands(row.principalAmount),
        )}</td></tr>`,
    )
    .join("");

  return `<div class="memo-maturity-card">
    <p class="memo-maturity-series-title"><strong>${escapeHtml(
      stripSeriesTableTitle(series.seriesName),
    )}</strong></p>
    <table class="memo-maturity-table">
      <thead>
        <tr>
          <th>${dateHeading}</th>
          <th>Par ($000)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>`;
};

const getMaturitySectionParts = (section: MemoSection) => {
  const wrapper = document.createElement("section");
  wrapper.className = "memo-section memo-section-maturity_schedule";
  wrapper.innerHTML = DOMPurify.sanitize(section.html);

  const heading = wrapper.querySelector(":scope > p");
  heading?.classList.add("memo-section-heading");

  const bodyParagraphs = Array.from(wrapper.querySelectorAll(":scope > p")).slice(1);
  const keepParagraphs = bodyParagraphs.filter((paragraph) => {
    const text = stripHtml(paragraph.innerHTML);

    if (!text || text === "XXXXX") {
      return false;
    }

    return !/^see pos for full maturity schedule\.?$/i.test(text);
  });

  return {
    headingHtml: heading?.outerHTML ?? '<p><strong>MATURITY SCHEDULE:</strong></p>',
    bodyParagraphHtmls: bodyParagraphs.map((paragraph) => paragraph.outerHTML),
    keepParagraphHtmls: keepParagraphs.map((paragraph) => paragraph.outerHTML),
  };
};

const buildMaturityScheduleMarkup = (
  section: MemoSection,
  maturitySchedule?: MaturitySchedule,
) => {
  const { headingHtml, bodyParagraphHtmls, keepParagraphHtmls } =
    getMaturitySectionParts(section);

  if (!maturitySchedule?.series.length) {
    return `<section class="memo-section memo-section-maturity_schedule">${headingHtml}${bodyParagraphHtmls.join("")}</section>`;
  }

  const tablesHtml = `<div class="memo-maturity-grid memo-gap-after">${maturitySchedule.series
    .map(buildMaturityTableHtml)
    .join("")}</div>`;

  return `<section class="memo-section memo-section-maturity_schedule">${headingHtml}${tablesHtml}${keepParagraphHtmls.join("")}</section>`;
};

const formatSectionMarkup = (
  section: MemoSection,
  maturitySchedule?: MaturitySchedule,
) => {
  if (section.kind === "maturity_schedule") {
    return buildMaturityScheduleMarkup(section, maturitySchedule);
  }

  const wrapper = document.createElement("section");
  wrapper.className = `memo-section memo-section-${section.kind}`;
  wrapper.innerHTML = DOMPurify.sanitize(section.html);

  if (section.kind === "issuer_series") {
    const issuerParagraph = wrapper.querySelector(":scope > p");
    const seriesTable = wrapper.querySelector(":scope > table");

    issuerParagraph?.classList.add("memo-issuer-line");

    if (seriesTable) {
      const seriesCells = Array.from(seriesTable.querySelectorAll("td"))
        .map((cell) => cell.innerHTML.trim())
        .filter((html) =>
          html
            .replace(/<br\s*\/?>/gi, "")
            .replace(/&nbsp;/gi, "")
            .trim().length > 0,
        );

      if (seriesCells.length > 0) {
        const seriesGrid = document.createElement("div");
        const seriesGridClass =
          seriesCells.length === 1
            ? "memo-series-grid-1"
            : seriesCells.length === 2
              ? "memo-series-grid-2"
              : "memo-series-grid-3";
        seriesGrid.className = `memo-series-grid ${seriesGridClass}`;

        seriesCells.forEach((html) => {
          const card = document.createElement("div");
          card.className = "memo-series-card";
          card.innerHTML = stripSeriesWord(html);
          seriesGrid.appendChild(card);
        });

        seriesTable.replaceWith(seriesGrid);
      }
    }
  }

  if (section.kind === "syndicate") {
    const paragraphs = Array.from(wrapper.querySelectorAll(":scope > p"));
    paragraphs.forEach((paragraph, index) => {
      paragraph.classList.add("memo-syndicate-item");

      if (index === paragraphs.length - 1) {
        paragraph.classList.add("memo-syndicate-block-end");
      }
    });
  }

  if (section.kind === "tax_exemptions") {
    const heading = wrapper.querySelector(":scope > p");
    const table = wrapper.querySelector(":scope > table");

    heading?.classList.add("memo-section-heading", "memo-heading-before-table");

    if (table instanceof HTMLTableElement) {
      const rebuiltTaxLayout = buildTaxTableLayout(table);

      if (rebuiltTaxLayout) {
        table.replaceWith(rebuiltTaxLayout);
      } else {
        table.classList.add("memo-tax-table");
      }
    }
  }

  if (section.kind === "content") {
    const heading = wrapper.querySelector(":scope > p");
    const text = heading?.textContent?.trim() ?? "";
    const inner = heading?.innerHTML.trim() ?? "";

    if (
      heading &&
      /^<strong>.*:<\/strong>$/i.test(inner) &&
      !text.startsWith("OPTIONAL SECTIONS:")
    ) {
      heading.classList.add("memo-section-heading");
    }
  }

  return wrapper.outerHTML;
};

const reorderSections = (
  sections: MemoSection[],
  draggedId: string,
  targetId: string,
) => {
  const nextSections = [...sections];
  const fromIndex = nextSections.findIndex((section) => section.id === draggedId);
  const toIndex = nextSections.findIndex((section) => section.id === targetId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return sections;
  }

  const [movedSection] = nextSections.splice(fromIndex, 1);
  nextSections.splice(toIndex, 0, movedSection);
  return nextSections;
};

interface ResultsPanelProps {
  memo: string;
  maturitySchedule?: MaturitySchedule;
  onMaturityScheduleChange: (value?: MaturitySchedule) => void;
  memoSections: MemoSection[];
  memoTitleHtml: string;
  onGoBack: () => void;
  onStartOver: () => void;
  pdfProcessing?: PdfProcessingMetadata;
}

export const ResultsPanel = ({
  memo,
  maturitySchedule,
  onMaturityScheduleChange,
  memoSections,
  memoTitleHtml,
  onGoBack,
  onStartOver,
  pdfProcessing,
}: ResultsPanelProps) => {
  const [copied, setCopied] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [orderedSections, setOrderedSections] = useState<MemoSection[]>(memoSections);
  const [isEditingMaturity, setIsEditingMaturity] = useState(false);
  const [editableMaturitySchedule, setEditableMaturitySchedule] = useState<
    MaturitySchedule | undefined
  >(createEditableMaturitySchedule(maturitySchedule));

  useEffect(() => {
    setOrderedSections(memoSections);
  }, [memoSections]);

  useEffect(() => {
    setIsEditingMaturity(false);
    setEditableMaturitySchedule(createEditableMaturitySchedule(maturitySchedule));
  }, [maturitySchedule]);

  const renderedTitleHtml = useMemo(
    () =>
      memoTitleHtml
        ? formatTitleMarkup(memoTitleHtml)
        : formatTitleMarkup(extractMemoHtml(memo)),
    [memo, memoTitleHtml],
  );

  const renderedSections = useMemo(
    () =>
      orderedSections.map((section) => ({
        ...section,
        renderedHtml: formatSectionMarkup(section, maturitySchedule),
      })),
    [maturitySchedule, orderedSections],
  );

  const memoHtml = useMemo(
    () => `${renderedTitleHtml}${renderedSections.map((section) => section.renderedHtml).join("")}`,
    [renderedSections, renderedTitleHtml],
  );

  const handleCopy = async () => {
    try {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = memoHtml;
      const plainText = tempDiv.innerText || tempDiv.textContent || "";

      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleSectionDrop = (targetId: string) => {
    if (!draggedSectionId) {
      return;
    }

    setOrderedSections((currentSections) =>
      reorderSections(currentSections, draggedSectionId, targetId),
    );
    setDraggedSectionId(null);
  };

  const updateEditableMaturityRow = (
    seriesIndex: number,
    rowIndex: number,
    field: keyof MaturityScheduleRow,
    value: string,
  ) => {
    setEditableMaturitySchedule((currentSchedule) => {
      if (!currentSchedule) {
        return currentSchedule;
      }

      return {
        ...currentSchedule,
        series: currentSchedule.series.map((series, currentSeriesIndex) => {
          if (currentSeriesIndex !== seriesIndex) {
            return series;
          }

          return {
            ...series,
            rows: series.rows.map((row, currentRowIndex) =>
              currentRowIndex === rowIndex ? { ...row, [field]: value } : row,
            ),
          };
        }),
      };
    });
  };

  const handleEditMaturity = () => {
    setEditableMaturitySchedule(createEditableMaturitySchedule(maturitySchedule));
    setIsEditingMaturity(true);
  };

  const handleCancelMaturityEdit = () => {
    setEditableMaturitySchedule(createEditableMaturitySchedule(maturitySchedule));
    setIsEditingMaturity(false);
  };

  const handleSaveMaturityEdit = () => {
    if (!editableMaturitySchedule) {
      return;
    }

    const nextSchedule = cloneMaturitySchedule(editableMaturitySchedule);

    if (!nextSchedule) {
      return;
    }

    for (const series of nextSchedule.series) {
      for (const row of series.rows) {
        const nextDateLabel = row.dateLabel.trim();
        const nextPrincipalAmount = formatFullPrincipalAmount(row.principalAmount);

        if (!nextDateLabel || !nextPrincipalAmount) {
          toast.error("Every maturity row needs a date and a numeric par amount.");
          return;
        }

        row.dateLabel = nextDateLabel;
        row.principalAmount = nextPrincipalAmount;
      }
    }

    onMaturityScheduleChange(nextSchedule);
    setIsEditingMaturity(false);
    toast.success("Maturity table updated");
  };

  const renderMaturitySection = (section: MemoSection) => {
    const { headingHtml, bodyParagraphHtmls, keepParagraphHtmls } =
      getMaturitySectionParts(section);
    const scheduleToRender =
      isEditingMaturity && editableMaturitySchedule ? editableMaturitySchedule : maturitySchedule;
    const paragraphHtmlsToRender = scheduleToRender?.series.length
      ? keepParagraphHtmls
      : bodyParagraphHtmls;
    const hasMultipleMaturityTables = (maturitySchedule?.series.length ?? 0) > 1;

    return (
      <>
        <div className="memo-maturity-heading-row">
          <div
            className="memo-section-body memo-maturity-heading"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
          {maturitySchedule?.series.length ? (
            isEditingMaturity ? (
              <div className="memo-maturity-heading-actions">
                <button
                  type="button"
                  onClick={handleSaveMaturityEdit}
                  className="memo-maturity-text-action"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancelMaturityEdit}
                  className="memo-maturity-text-action memo-maturity-text-action-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEditMaturity}
                className="memo-maturity-text-action"
              >
                {hasMultipleMaturityTables ? "Edit Tables" : "Edit Table"}
              </button>
            )
          ) : null}
        </div>

        {scheduleToRender?.series.length ? (
          <div className="memo-maturity-grid memo-gap-after">
            {scheduleToRender.series.map((series, seriesIndex) => (
              <div className="memo-maturity-card" key={`${series.seriesName}-${seriesIndex}`}>
                <p className="memo-maturity-series-title">
                  <strong>{stripSeriesTableTitle(series.seriesName)}</strong>
                </p>
                <table className="memo-maturity-table">
                  <thead>
                    <tr>
                      <th>{getMaturityDateHeading(series)}</th>
                      <th>Par ($000)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.rows.map((row, rowIndex) => (
                      <tr key={`${series.seriesName}-${rowIndex}`}>
                        <td>
                          {isEditingMaturity ? (
                            <input
                              type="text"
                              value={row.dateLabel}
                              onChange={(event) =>
                                updateEditableMaturityRow(
                                  seriesIndex,
                                  rowIndex,
                                  "dateLabel",
                                  event.target.value,
                                )
                              }
                              className="memo-maturity-input"
                              aria-label={`${stripSeriesTableTitle(series.seriesName)} maturity date ${
                                rowIndex + 1
                              }`}
                            />
                          ) : (
                            row.dateLabel
                          )}
                        </td>
                        <td>
                          {isEditingMaturity ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.principalAmount}
                              onChange={(event) =>
                                updateEditableMaturityRow(
                                  seriesIndex,
                                  rowIndex,
                                  "principalAmount",
                                  event.target.value,
                                )
                              }
                              className="memo-maturity-input memo-maturity-input-amount"
                              aria-label={`${stripSeriesTableTitle(series.seriesName)} par amount ${
                                rowIndex + 1
                              }`}
                            />
                          ) : (
                            formatParAmountInThousands(row.principalAmount)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : null}

        {paragraphHtmlsToRender.map((paragraphHtml, index) => (
          <div
            key={`maturity-paragraph-${index}`}
            className="memo-section-body"
            dangerouslySetInnerHTML={{ __html: paragraphHtml }}
          />
        ))}

        <div className="memo-maturity-actions">
          <MaturityScheduleCapture
            value={maturitySchedule}
            onChange={onMaturityScheduleChange}
          />
        </div>
      </>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-elegant overflow-hidden">
        <div className="bg-gradient-hero flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <h2 className="text-base font-semibold text-primary-foreground md:text-lg">
            Generated Sales Memo
          </h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleCopy}
              className="h-10 w-10 bg-white/10 p-0 text-white border-white/20 hover:bg-white/20 md:h-9 md:w-auto md:px-3"
              aria-label={copied ? "Copied" : "Copy"}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Copy</span>
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={onGoBack}
              className="h-10 w-10 bg-white/10 p-0 text-white border-white/20 hover:bg-white/20 md:h-9 md:w-auto md:px-3"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Go Back</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={onStartOver}
              className="h-10 w-10 bg-white/10 p-0 text-white border-white/20 hover:bg-white/20 md:h-9 md:w-auto md:px-3"
              aria-label="Start Over"
            >
              <RotateCcw className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Start Over</span>
            </Button>
          </div>
        </div>

        <div className="memo-results-shell">
          <div className="memo-results-row memo-results-row-title">
            <div
              className="memo-results-rail memo-results-rail-title"
              aria-hidden="true"
            />
            <div className="memo-results-canvas memo-results-canvas-title">
              <div className="memo-document-block memo-document-block-title">
                <div className="memo-output prose prose-sm max-w-none">
                  <div
                    className="memo-title-measure"
                    dangerouslySetInnerHTML={{ __html: renderedTitleHtml }}
                  />
                </div>
              </div>
            </div>
          </div>

          {renderedSections.map((section) => (
            <div
              key={section.id}
              className={`memo-section-row ${
                draggedSectionId === section.id ? "memo-section-row-active" : ""
              } memo-section-row-${section.kind}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleSectionDrop(section.id)}
            >
              <div className="memo-results-rail memo-results-rail-section">
                <button
                  type="button"
                  draggable
                  onDragStart={() => setDraggedSectionId(section.id)}
                  onDragEnd={() => setDraggedSectionId(null)}
                  className={`memo-rail-item ${
                    draggedSectionId === section.id ? "memo-rail-item-active" : ""
                  }`}
                  aria-label={`Reorder ${section.title}`}
                >
                  <span className="memo-rail-dots" aria-hidden="true">
                    <span className="memo-rail-dot" />
                    <span className="memo-rail-dot" />
                    <span className="memo-rail-dot" />
                  </span>
                </button>
              </div>

              <div className="memo-results-canvas memo-results-canvas-section">
                <div className="memo-document-block memo-document-block-section">
                  <div className="memo-output prose prose-sm max-w-none">
                    {section.kind === "maturity_schedule" ? (
                      renderMaturitySection(section)
                    ) : (
                      <div
                        className="memo-section-body"
                        dangerouslySetInnerHTML={{ __html: section.renderedHtml }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-4 bg-muted/50 border border-border rounded-lg">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold" style={{ color: "hsl(var(--error-marker))" }}>
            XXXXX
          </span>{" "}
          symbol indicates missing or uncertain information that requires verification.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          For best results, documents should be unlocked and word-searchable.
        </p>
      </div>
    </div>
  );
};
