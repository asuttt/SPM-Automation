export type PdfPreflightStatus =
  | "healthy"
  | "needs_normalization"
  | "password_protected"
  | "unsupported";

export interface PdfProcessingMetadata {
  preflightStatus: PdfPreflightStatus;
  preflightReason: string;
  normalizationApplied: boolean;
  normalizationProvider: string | null;
  normalizationReason: string;
  warning?: string;
}

export type MaturityDateMode = "header_month_day" | "full_date";

export interface MaturityScheduleRow {
  dateLabel: string;
  principalAmount: string;
  isTermBond?: boolean;
}

export interface MaturitySeriesSchedule {
  seriesName: string;
  dateMode: MaturityDateMode;
  headerDateLabel?: string;
  rows: MaturityScheduleRow[];
}

export interface MaturitySchedule {
  title?: string;
  sourcePageHint?: number;
  series: MaturitySeriesSchedule[];
}

export type MemoSectionKind =
  | "issuer_series"
  | "syndicate"
  | "schedule"
  | "maturity_schedule"
  | "tax_exemptions"
  | "ratings"
  | "content";

export interface MemoSection {
  id: string;
  title: string;
  kind: MemoSectionKind;
  html: string;
}

export interface GenerateMemoResponse {
  memo: string;
  memoTitleHtml?: string;
  memoSections?: MemoSection[];
  maturitySchedule?: MaturitySchedule;
  pdfProcessing?: PdfProcessingMetadata;
}

export interface ExtractMaturityScheduleResponse {
  maturitySchedule?: MaturitySchedule;
}
