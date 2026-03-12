import { ArrowLeft, Copy, RotateCcw, Check } from "lucide-react";
import { useState } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { type PdfProcessingMetadata } from "@/types/generateMemo";

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

const formatMemoHtml = (content: string) => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = content;

  const children = Array.from(wrapper.children);
  const topLevelTables = Array.from(wrapper.querySelectorAll(":scope > table"));
  const seriesTable = topLevelTables[0] ?? null;

  if (children[0]?.tagName === "P") {
    children[0].classList.add("memo-gap-after");
  }

  if (children[1]?.tagName === "P") {
    children[1].classList.add("memo-issuer-line");
  }

  if (seriesTable) {
    const seriesCells = Array.from(seriesTable.querySelectorAll("td"))
      .map((cell) => cell.innerHTML.trim())
      .filter((html) => html.replace(/<br\s*\/?>/gi, "").replace(/&nbsp;/gi, "").trim().length > 0);

    if (seriesCells.length > 0) {
      const seriesGrid = document.createElement("div");
      const seriesGridClass =
        seriesCells.length === 1
          ? "memo-series-grid-1"
          : seriesCells.length === 2
            ? "memo-series-grid-2"
            : "memo-series-grid-3";
      seriesGrid.className = `memo-series-grid ${seriesGridClass} memo-gap-after`;

      seriesCells.forEach((html) => {
        const card = document.createElement("div");
        card.className = "memo-series-card";
        card.innerHTML = stripSeriesWord(html);
        seriesGrid.appendChild(card);
      });

      seriesTable.replaceWith(seriesGrid);
    }
  }

  const topLevelParagraphs = Array.from(wrapper.querySelectorAll(":scope > p"));

  topLevelParagraphs.forEach((paragraph) => {
    const text = paragraph.textContent?.trim() ?? "";
    const inner = paragraph.innerHTML.trim();
    const nextElement = paragraph.nextElementSibling;

    if (text === "OPTIONAL SECTIONS:") {
      paragraph.remove();
      return;
    }

    if (
      text.startsWith("BOOKRUNNER:") ||
      text.startsWith("CO-SENIOR:") ||
      text.startsWith("CO-MANAGER:") ||
      text.startsWith("SCHEDULE:") ||
      text.startsWith("RATINGS (M/S&P/F/K):")
    ) {
      if (
        text.startsWith("BOOKRUNNER:") ||
        text.startsWith("CO-SENIOR:") ||
        text.startsWith("CO-MANAGER:")
      ) {
        paragraph.classList.add("memo-syndicate-item");
      }

      if (
        text.startsWith("CO-MANAGER:") ||
        text.startsWith("SCHEDULE:") ||
        text.startsWith("RATINGS (M/S&P/F/K):")
      ) {
        paragraph.classList.add("memo-gap-after");
      }

      if (text.startsWith("CO-MANAGER:")) {
        paragraph.classList.add("memo-syndicate-block-end");
      }
    }

    if (
      /^<strong>.*:<\/strong>$/i.test(inner) &&
      !text.startsWith("OPTIONAL SECTIONS:")
    ) {
      paragraph.classList.add("memo-section-heading");

      if (nextElement?.tagName === "TABLE") {
        paragraph.classList.add("memo-heading-before-table");
      }
    }
  });

  if (topLevelTables[1]) {
    const rebuiltTaxLayout = buildTaxTableLayout(topLevelTables[1]);

    if (rebuiltTaxLayout) {
      topLevelTables[1].replaceWith(rebuiltTaxLayout);
    } else {
      topLevelTables[1].classList.add("memo-gap-after", "memo-tax-table");
    }
  }

  return wrapper.innerHTML;
};

interface ResultsPanelProps {
  memo: string;
  onGoBack: () => void;
  onStartOver: () => void;
  pdfProcessing?: PdfProcessingMetadata;
}

export const ResultsPanel = ({
  memo,
  onGoBack,
  onStartOver,
  pdfProcessing,
}: ResultsPanelProps) => {
  const [copied, setCopied] = useState(false);
  const memoHtml = formatMemoHtml(
    DOMPurify.sanitize(extractMemoHtml(memo)),
  );

  const handleCopy = async () => {
    try {
      // Create a temporary element to get plain text from HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = memoHtml;
      const plainText = tempDiv.innerText || tempDiv.textContent || "";

      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-elegant overflow-hidden">
        {/* Header */}
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

        {/* Memo Content */}
        <div className="p-8 bg-white">
          <div
            className="memo-output prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: memoHtml }}
          />
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-4 bg-muted/50 border border-border rounded-lg">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold" style={{ color: "hsl(var(--error-marker))" }}>
            XXXXX
          </span>{" "}
          markers indicate missing or uncertain information that requires verification.
        </p>
        {pdfProcessing && (
          <p className="mt-2 text-xs text-muted-foreground">
            PDF preflight: {pdfProcessing.preflightReason}
            {pdfProcessing.normalizationApplied
              ? ` Auto-normalization was applied${pdfProcessing.normalizationProvider ? ` via ${pdfProcessing.normalizationProvider}` : ""}.`
              : pdfProcessing.warning
                ? ` ${pdfProcessing.warning}`
                : ""}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Best results come from searchable print-to-PDF offering documents rather
          than locked or scan-only source files.
        </p>
      </div>
    </div>
  );
};
