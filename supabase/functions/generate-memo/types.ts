export interface ScheduleOverrides {
  posMail?: string;
  pricing?: string;
  closing?: string;
}

export interface GenerateMemoRequest {
  pdfBase64?: string;
  extractedArtifact?: string;
  optionalSections?: string[];
  scheduleOverrides?: ScheduleOverrides;
}

export interface PromptBuildOptions {
  supplementalText?: string;
  extractedArtifact?: string;
  sourceMode?: "pdf" | "artifact" | "hybrid";
}

export interface MaturityExtractOptions {
  imageDataUrl?: string;
  imageDataUrls?: string[];
}
