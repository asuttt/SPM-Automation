export type PdfPreflightStatus =
  | "healthy"
  | "needs_normalization"
  | "password_protected"
  | "unsupported";

export interface PdfPreflightMetrics {
  pageCountEstimate: number;
  imageObjectCount: number;
  textOperatorCount: number;
  fontObjectCount: number;
  extractedCharCount: number;
}

export interface PdfPreflightResult {
  status: PdfPreflightStatus;
  reason: string;
  metrics: PdfPreflightMetrics;
}

export interface PdfNormalizationResult {
  pdfBase64: string;
  applied: boolean;
  provider: string | null;
  reason: string;
  supplementalText?: string;
}

export interface PdfProcessingMetadata {
  preflightStatus: PdfPreflightStatus;
  preflightReason: string;
  normalizationApplied: boolean;
  normalizationProvider: string | null;
  normalizationReason: string;
  warning?: string;
}
