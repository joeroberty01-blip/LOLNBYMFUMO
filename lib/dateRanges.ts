import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachHourOfInterval,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
} from "date-fns";

export const periods = ["daily", "weekly", "monthly", "annually", "custom"] as const;
export type Period = (typeof periods)[number];

export type DateRangeParams = {
  period: Period;
  date?: string; // yyyy-MM-dd, used by "daily"
  weekOf?: string; // yyyy-MM-dd (any day in the target week), used by "weekly"
  month?: string; // 1-12, used by "monthly"
  year?: string; // yyyy, used by "monthly" and "annually"
  from?: string; // yyyy-MM-dd, used by "custom"
  to?: string; // yyyy-MM-dd, used by "custom"
};

export type DateRange = {
  start: Date;
  end: Date;
  label: string;
  granularity: "hour" | "day" | "month";
};

const WEEK_STARTS_ON = 1; // Monday

export function getDateRange(params: DateRangeParams): DateRange {
  const now = new Date();
  const period: Period = params.period && periods.includes(params.period) ? params.period : "daily";

  switch (period) {
    case "daily": {
      const day = params.date ? new Date(`${params.date}T00:00:00`) : now;
      return {
        start: startOfDay(day),
        end: endOfDay(day),
        label: format(day, "d MMM yyyy"),
        granularity: "hour",
      };
    }
    case "weekly": {
      const anchor = params.weekOf ? new Date(`${params.weekOf}T00:00:00`) : now;
      const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
      const end = endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
      return {
        start,
        end,
        label: `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`,
        granularity: "day",
      };
    }
    case "monthly": {
      const year = params.year ? Number(params.year) : now.getFullYear();
      const month = params.month ? Number(params.month) - 1 : now.getMonth();
      const anchor = new Date(year, month, 1);
      return {
        start: startOfMonth(anchor),
        end: endOfMonth(anchor),
        label: format(anchor, "MMMM yyyy"),
        granularity: "day",
      };
    }
    case "annually": {
      const year = params.year ? Number(params.year) : now.getFullYear();
      const anchor = new Date(year, 0, 1);
      return {
        start: startOfYear(anchor),
        end: endOfYear(anchor),
        label: `${year}`,
        granularity: "month",
      };
    }
    case "custom": {
      const from = params.from ? new Date(`${params.from}T00:00:00`) : startOfDay(now);
      const to = params.to ? new Date(`${params.to}T23:59:59`) : endOfDay(now);
      return {
        start: from,
        end: to,
        label: `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`,
        granularity: "day",
      };
    }
  }
}

export type Bucket = { key: string; label: string };

/** Shared bucketing so every chart (Sales, Financial) slices the same range the same way. */
export function getBuckets(range: DateRange): Bucket[] {
  if (range.granularity === "hour") {
    return eachHourOfInterval({ start: range.start, end: range.end }).map((d) => ({
      key: format(d, "yyyy-MM-dd HH"),
      label: format(d, "HH:00"),
    }));
  }
  if (range.granularity === "month") {
    return eachMonthOfInterval({ start: range.start, end: range.end }).map((d) => ({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM"),
    }));
  }
  return eachDayOfInterval({ start: range.start, end: range.end }).map((d) => ({
    key: format(d, "yyyy-MM-dd"),
    label: format(d, "d MMM"),
  }));
}

export function bucketKeyForDate(date: Date, granularity: DateRange["granularity"]): string {
  if (granularity === "hour") return format(date, "yyyy-MM-dd HH");
  if (granularity === "month") return format(date, "yyyy-MM");
  return format(date, "yyyy-MM-dd");
}
