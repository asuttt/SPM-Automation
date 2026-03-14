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
