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

export interface GenerateMemoResponse {
  memo: string;
  pdfProcessing?: PdfProcessingMetadata;
}
