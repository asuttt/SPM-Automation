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

export type MemoSectionKind =
  | "issuer_series"
  | "syndicate"
  | "schedule"
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
  pdfProcessing?: PdfProcessingMetadata;
}
