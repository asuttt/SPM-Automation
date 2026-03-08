export interface ScheduleOverrides {
  posMail?: string;
  pricing?: string;
  closing?: string;
}

export interface GenerateMemoRequest {
  pdfBase64: string;
  optionalSections?: string[];
  scheduleOverrides?: ScheduleOverrides;
}
