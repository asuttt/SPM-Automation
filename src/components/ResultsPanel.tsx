import { ArrowLeft, Check, Copy, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
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

const formatSectionMarkup = (section: MemoSection) => {
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
  memoSections: MemoSection[];
  memoTitleHtml: string;
  onGoBack: () => void;
  onStartOver: () => void;
  pdfProcessing?: PdfProcessingMetadata;
}

export const ResultsPanel = ({
  memo,
  memoSections,
  memoTitleHtml,
  onGoBack,
  onStartOver,
  pdfProcessing,
}: ResultsPanelProps) => {
  const [copied, setCopied] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [orderedSections, setOrderedSections] = useState<MemoSection[]>(memoSections);

  useEffect(() => {
    setOrderedSections(memoSections);
  }, [memoSections]);

  const renderedTitleHtml = useMemo(
    () =>
      memoTitleHtml
        ? formatTitleMarkup(memoTitleHtml)
        : formatTitleMarkup(extractMemoHtml(memo)),
    [memo, memoTitleHtml],
  );

  const renderedSections = useMemo(
    () => orderedSections.map((section) => ({ ...section, renderedHtml: formatSectionMarkup(section) })),
    [orderedSections],
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

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-elegant overflow-hidden">
        <div className="bg-gradient-hero px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-foreground">
            Generated Sales Memo
          </h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onGoBack}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onStartOver}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
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
              }`}
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
                    <div
                      className="memo-section-body"
                      dangerouslySetInnerHTML={{ __html: section.renderedHtml }}
                    />
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
          Best results come from documents that are unlocked and word-searchable.
        </p>
      </div>
    </div>
  );
};
