import type {
  MaturitySchedule,
  MemoSection,
  MemoSectionKind,
  PdfProcessingMetadata,
} from "@/types/generateMemo";

export interface ExportBrandingSelection {
  id: string;
  label: string;
  logoSrc?: string | null;
}

export interface ExportScheduleOverrides {
  dealId?: string;
  posMail?: string;
  pricing?: string;
  closing?: string;
}

export interface ExportDocumentTitle {
  html: string;
  text: string;
}

export interface ExportParagraphBlock {
  type: "paragraph";
  html: string;
  text: string;
}

export interface ExportTableBlock {
  type: "table";
  rows: string[][];
}

export interface ExportMaturityRow {
  dateLabel: string;
  principalAmount: string;
  principalAmountThousands: string;
  isTermBond: boolean;
}

export interface ExportMaturitySeriesTable {
  seriesName: string;
  displayTitle: string;
  dateHeading: string;
  amountHeading: string;
  rows: ExportMaturityRow[];
}

export interface ExportMaturityGridBlock {
  type: "maturity_grid";
  tables: ExportMaturitySeriesTable[];
}

export type ExportSectionBlock =
  | ExportParagraphBlock
  | ExportTableBlock
  | ExportMaturityGridBlock;

export interface ExportDocumentSection {
  id: string;
  title: string;
  kind: MemoSectionKind;
  isCompact: boolean;
  html: string;
  text: string;
  sourceSection?: MemoSection;
  blocks: ExportSectionBlock[];
}

export interface ExportDocumentMetadata {
  generatedAtIso: string;
  pdfProcessing?: PdfProcessingMetadata;
  scheduleOverrides: ExportScheduleOverrides;
}

export interface ExportDocument {
  version: 1;
  branding: ExportBrandingSelection;
  title: ExportDocumentTitle;
  sections: ExportDocumentSection[];
  sectionOrder: string[];
  maturitySchedule?: MaturitySchedule;
  metadata: ExportDocumentMetadata;
}

