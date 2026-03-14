import { generateJsonWithGemini } from "./gemini.ts";
import {
  type MaturityDateMode,
  type MaturitySchedule,
  type MaturityScheduleRow,
  type MaturitySeriesSchedule,
} from "./maturity-types.ts";
import { type MaturityExtractOptions } from "./types.ts";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const parseImageDataUrl = (value?: string) => {
  const text = normalizeString(value);

  if (!text) {
    return null;
  }

  const match = text.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
};

const parseImageDataUrls = (values?: string[]) =>
  Array.isArray(values)
    ? values
        .map((value) => parseImageDataUrl(value))
        .filter(
          (
            attachment,
          ): attachment is { mimeType: string; data: string } => Boolean(attachment),
        )
    : [];

const titleCaseWords = (value: string) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeHeaderDateLabel = (value: unknown) => {
  const text = normalizeString(value)
    .replace(/^maturity\s*/i, "")
    .replace(/[()]/g, "")
    .replace(/\*/g, "")
    .trim();

  if (!text) {
    return "";
  }

  const monthMatch = text.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
  );

  if (!monthMatch) {
    return titleCaseWords(text);
  }

  return `${titleCaseWords(monthMatch[1])} ${monthMatch[2]}`;
};

const normalizeMoney = (value: unknown) => {
  const text = normalizeString(value);

  if (!text) {
    return "";
  }

  const numeric = text.replace(/[^0-9.()-]/g, "");

  if (!numeric) {
    return text;
  }

  const parsed = Number(numeric.replace(/[(),]/g, ""));

  if (!Number.isFinite(parsed)) {
    return text.startsWith("$") ? text : `$${text}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(parsed);
};

const monthIndexFromToken = (token: string) =>
  MONTHS.findIndex((month) => month === token.toLowerCase());

const parseNumericDate = (value: string) => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (!match) {
    return null;
  }

  const [, month, day, year] = match;
  const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);
  const date = new Date(Date.UTC(fullYear, Number(month) - 1, Number(day)));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    month: Number(month),
    day: Number(day),
    year: fullYear,
  };
};

const parseTextualDate = (value: string) => {
  const match = value.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,\s*(\d{2,4}))?/i,
  );

  if (!match) {
    return null;
  }

  const month = monthIndexFromToken(match[1]);

  if (month === -1) {
    return null;
  }

  const yearToken = match[3];
  const year = yearToken
    ? yearToken.length === 2
      ? 2000 + Number(yearToken)
      : Number(yearToken)
    : undefined;

  return {
    month: month + 1,
    day: Number(match[2]),
    year,
  };
};

const formatShortDate = (month: number, day: number, year: number) =>
  `${month}/${day}/${String(year).slice(-2)}`;

const inferDateMode = (
  rawMode: unknown,
  headerDateLabel: string,
  rows: Array<Record<string, unknown>>,
): MaturityDateMode => {
  if (rawMode === "full_date" || rawMode === "header_month_day") {
    return rawMode;
  }

  const hasSlashDate = rows.some((row) =>
    /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(normalizeString(row.dateLabel)),
  );

  if (hasSlashDate || !headerDateLabel) {
    return "full_date";
  }

  return "header_month_day";
};

const normalizeDateLabel = (
  value: unknown,
  dateMode: MaturityDateMode,
  headerDateLabel: string,
) => {
  const text = normalizeString(value).replace(/\*/g, "");

  if (!text) {
    return "";
  }

  const yearMatch = text.match(/\b(20\d{2})\b/);

  if (dateMode === "header_month_day") {
    if (yearMatch) {
      return yearMatch[1];
    }

    const parsed = parseNumericDate(text) ?? parseTextualDate(text);

    if (parsed?.year) {
      return String(parsed.year);
    }

    return text;
  }

  const numeric = parseNumericDate(text);

  if (numeric) {
    return formatShortDate(numeric.month, numeric.day, numeric.year);
  }

  const textual = parseTextualDate(text);

  if (textual?.year) {
    return formatShortDate(textual.month, textual.day, textual.year);
  }

  if (yearMatch && headerDateLabel) {
    const headerDate = parseTextualDate(headerDateLabel);

    if (headerDate) {
      return formatShortDate(headerDate.month, headerDate.day, Number(yearMatch[1]));
    }
  }

  return text;
};

const sortKeyForRow = (
  row: MaturityScheduleRow,
  dateMode: MaturityDateMode,
  headerDateLabel: string,
) => {
  if (dateMode === "header_month_day") {
    const headerDate = parseTextualDate(headerDateLabel);
    const year = Number(row.dateLabel);

    if (headerDate && Number.isFinite(year)) {
      return Date.UTC(year, headerDate.month - 1, headerDate.day);
    }

    return Number.isFinite(year) ? year : Number.MAX_SAFE_INTEGER;
  }

  const numericDate = parseNumericDate(row.dateLabel);

  if (numericDate) {
    return Date.UTC(numericDate.year, numericDate.month - 1, numericDate.day);
  }

  return Number.MAX_SAFE_INTEGER;
};

const normalizeRows = (
  rows: unknown,
  dateMode: MaturityDateMode,
  headerDateLabel: string,
) => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const normalizedRows = rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const dateLabel = normalizeDateLabel(
        record.dateLabel ?? record.maturityDate ?? record.maturity ?? record.year,
        dateMode,
        headerDateLabel,
      );
      const principalAmount = normalizeMoney(
        record.principalAmount ?? record.parAmount ?? record.amount,
      );

      if (!dateLabel || !principalAmount) {
        return null;
      }

      return {
        dateLabel,
        principalAmount,
        isTermBond: Boolean(record.isTermBond),
      } satisfies MaturityScheduleRow;
    })
    .filter((row): row is MaturityScheduleRow => Boolean(row));

  return normalizedRows.sort(
    (a, b) =>
      sortKeyForRow(a, dateMode, headerDateLabel) -
      sortKeyForRow(b, dateMode, headerDateLabel),
  );
};

const normalizeSeries = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const seriesName = normalizeString(record.seriesName || record.title);
  const headerDateLabel = normalizeHeaderDateLabel(record.headerDateLabel);
  const dateMode = inferDateMode(
    record.dateMode,
    headerDateLabel,
    Array.isArray(record.rows)
      ? (record.rows as Array<Record<string, unknown>>)
      : [],
  );
  const rows = normalizeRows(record.rows, dateMode, headerDateLabel);

  if (!seriesName || rows.length === 0) {
    return null;
  }

  return {
    seriesName,
    dateMode,
    headerDateLabel: dateMode === "header_month_day" ? headerDateLabel : undefined,
    rows,
  } satisfies MaturitySeriesSchedule;
};

const normalizeSchedule = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const series = Array.isArray(record.series)
    ? record.series.map(normalizeSeries).filter((item): item is MaturitySeriesSchedule => Boolean(item))
    : [];

  if (series.length === 0) {
    return null;
  }

  const sourcePageHint =
    typeof record.sourcePageHint === "number" ? record.sourcePageHint : undefined;

  return {
    title: normalizeString(record.title) || "Maturity Schedule",
    sourcePageHint,
    series,
  } satisfies MaturitySchedule;
};

const sortRows = (
  rows: MaturityScheduleRow[],
  dateMode: MaturityDateMode,
  headerDateLabel: string,
) =>
  [...rows].sort(
    (a, b) =>
      sortKeyForRow(a, dateMode, headerDateLabel) -
      sortKeyForRow(b, dateMode, headerDateLabel),
  );

const mergeSchedules = (schedules: MaturitySchedule[]) => {
  if (schedules.length === 0) {
    return null;
  }

  const mergedSeries = new Map<string, MaturitySeriesSchedule>();

  schedules.forEach((schedule) => {
    schedule.series.forEach((series) => {
      const existingSeries = mergedSeries.get(series.seriesName);

      if (!existingSeries) {
        mergedSeries.set(series.seriesName, {
          ...series,
          rows: [...series.rows],
        });
        return;
      }

      const existingRows = new Map(
        existingSeries.rows.map((row) => [row.dateLabel, row]),
      );

      series.rows.forEach((row) => {
        const existingRow = existingRows.get(row.dateLabel);

        if (!existingRow) {
          existingRows.set(row.dateLabel, row);
          return;
        }

        if (existingRow.principalAmount !== row.principalAmount) {
          console.warn("Conflicting maturity row detected while merging screenshots", {
            seriesName: series.seriesName,
            dateLabel: row.dateLabel,
            existingPrincipalAmount: existingRow.principalAmount,
            nextPrincipalAmount: row.principalAmount,
          });
        }
      });

      const mergedHeaderDateLabel =
        existingSeries.headerDateLabel || series.headerDateLabel || "";
      const mergedDateMode =
        existingSeries.dateMode === "full_date" || series.dateMode === "full_date"
          ? "full_date"
          : "header_month_day";

      mergedSeries.set(series.seriesName, {
        ...existingSeries,
        dateMode: mergedDateMode,
        headerDateLabel:
          mergedDateMode === "header_month_day" ? mergedHeaderDateLabel : undefined,
        rows: sortRows(
          Array.from(existingRows.values()),
          mergedDateMode,
          mergedHeaderDateLabel,
        ),
      });
    });
  });

  const merged = Array.from(mergedSeries.values());

  if (merged.length === 0) {
    return null;
  }

  return {
    title: schedules[0]?.title || "Maturity Schedule",
    sourcePageHint: schedules[0]?.sourcePageHint,
    series: merged,
  } satisfies MaturitySchedule;
};

const buildMaturityPrompt = () => {
  return `Extract the maturity schedule from the provided screenshot or screenshots and return JSON only.

Required JSON shape:
{
  "title": "Maturity Schedule",
  "sourcePageHint": 2,
  "series": [
    {
      "seriesName": "Series 2026A",
      "dateMode": "header_month_day",
      "headerDateLabel": "March 1",
      "rows": [
        { "dateLabel": "2036", "principalAmount": "$1,140,000", "isTermBond": false },
        { "dateLabel": "2051", "principalAmount": "$53,275,000", "isTermBond": true }
      ]
    }
  ]
}

Rules:
- Return valid JSON only. No markdown fences. No commentary.
- Focus on the maturity schedule page(s), usually near the inside cover.
- You may receive multiple screenshots. Treat them as ordered pages from the same maturity schedule and combine them into one result.
- Capture each bond series separately.
- If a series uses one shared maturity day/month in the header (example: "Maturity (March 1)"), set dateMode to "header_month_day", set headerDateLabel to that month/day, and use year-only dateLabel values like "2036", "2037", "2051".
- If a series needs specific maturity dates in each row, set dateMode to "full_date" and use m/d/yy dateLabel values like "3/1/36" or "9/1/36".
- Include term bonds in rows as if they were any other maturity rows, appended according to chronological date order. Set isTermBond to true when clear from the source.
- principalAmount must include a leading $ and comma separators.
- Ignore empty interest-rate, yield, price, and CUSIP columns unless needed to identify the row.
- Do not invent rows. If a series has no readable maturity rows, omit that series.
- Use title "Maturity Schedule" unless the page uses a clearly different heading.
- Do not rely on surrounding document context not visible in the screenshot.
- When a series table uses a shared month/day heading, keep the month/day in headerDateLabel and use years only in the rows.
- When rows show full maturity dates, keep the rows as full dates and set dateMode to "full_date".`;
};

const extractScheduleFromAttachments = async (
  attachments: Array<{ mimeType: string; data: string }>,
  mode: "combined" | "single-image",
) => {
  try {
    const raw = await generateJsonWithGemini<unknown>(
      buildMaturityPrompt(),
      attachments,
    );

    return normalizeSchedule(raw);
  } catch (error) {
    console.error("Maturity schedule extraction failed", {
      mode,
      attachmentCount: attachments.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export const extractMaturitySchedule = async (
  options: MaturityExtractOptions,
) => {
  const multiImageAttachments = parseImageDataUrls(options.imageDataUrls);
  const imageAttachments =
    multiImageAttachments.length > 0
      ? multiImageAttachments
      : options.imageDataUrl
        ? [parseImageDataUrl(options.imageDataUrl)].filter(
            (
              attachment,
            ): attachment is { mimeType: string; data: string } => Boolean(attachment),
          )
        : [];

  if (imageAttachments.length === 0) {
    return null;
  }

  const combinedSchedule = await extractScheduleFromAttachments(
    imageAttachments,
    "combined",
  );

  if (combinedSchedule) {
    return combinedSchedule;
  }

  if (imageAttachments.length === 1) {
    return null;
  }

  const perImageSchedules = (
    await Promise.all(
      imageAttachments.map((attachment) =>
        extractScheduleFromAttachments([attachment], "single-image"),
      ),
    )
  ).filter((schedule): schedule is MaturitySchedule => Boolean(schedule));

  if (perImageSchedules.length === 0) {
    return null;
  }

  return mergeSchedules(perImageSchedules);
};
