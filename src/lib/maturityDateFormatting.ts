import type { MaturityDateMode } from "@/types/generateMemo";

export const formatMaturityDateLabel = (
  value: string,
  dateMode: MaturityDateMode,
) => {
  const trimmed = value.trim();

  if (dateMode !== "full_date") {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (!match) {
    return trimmed;
  }

  const [, month, day, year] = match;
  const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);

  if (!Number.isFinite(fullYear)) {
    return trimmed;
  }

  return `${Number(month)}/${Number(day)}/${fullYear}`;
};
