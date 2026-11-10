// Pure helpers for the backup schedule form: when a schedule will run next, and what its
// retention keeps. They mirror the server (service/backup/schedule_time.go and retention.go) so the
// form can show a preview before anything is saved; the server stays the source of truth.

export type PlanCadence = 'hourly' | 'daily' | 'weekly' | 'monthly';

export type PlanTiming = {
  cadence: PlanCadence;
  hour: number;
  minute: number;
  /** 0 is Sunday. */
  weekday: number;
  monthDay: number;
  timezone: string;
};

export type PlanRetention = { keepSmart: boolean; keepLast: number; keepDays: number };

const HOUR_MS = 3_600_000;

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timezone: string): Intl.DateTimeFormat => {
  let f = formatters.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short'
    });
    formatters.set(timezone, f);
  }
  return f;
};

/** The wall clock in `timezone` at an instant. Throws RangeError for an unknown zone. */
const localParts = (ms: number, timezone: string): LocalParts => {
  const p = Object.fromEntries(
    formatterFor(timezone)
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value])
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday)
  };
};

/** The instant a wall-clock time happens in `timezone`. Out-of-range days and months roll over, like Go's time.Date. */
const zonedToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): number => {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (utc: number): number => {
    const l = localParts(utc, timezone);
    return Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute) - Math.floor(utc / 60_000) * 60_000;
  };
  // The offset depends on the answer (daylight saving), so settle it in two passes.
  const first = naive - offsetAt(naive);
  return naive - offsetAt(first);
};

/** The first run strictly after `from`. */
export const nextRun = (t: PlanTiming, from: Date): Date => {
  const now = from.getTime();
  const l = localParts(now, t.timezone);
  const at = (day: number, month = l.month): number => zonedToUtc(l.year, month, day, t.hour, t.minute, t.timezone);

  switch (t.cadence) {
    case 'hourly': {
      const next = zonedToUtc(l.year, l.month, l.day, l.hour, t.minute, t.timezone);
      return new Date(next > now ? next : next + HOUR_MS);
    }
    case 'weekly': {
      const day = l.day + ((t.weekday - l.weekday + 7) % 7);
      const next = at(day);
      return new Date(next > now ? next : at(day + 7));
    }
    case 'monthly': {
      const next = at(t.monthDay);
      return new Date(next > now ? next : at(t.monthDay, l.month + 1));
    }
    default: {
      const next = at(l.day);
      return new Date(next > now ? next : at(l.day + 1));
    }
  }
};

/** The next `count` runs, or an empty list when the time zone is unknown. */
export const nextRuns = (t: PlanTiming, from: Date, count: number): Date[] => {
  try {
    const runs: Date[] = [];
    let cursor = from;
    for (let i = 0; i < count; i++) {
      cursor = nextRun(t, cursor);
      runs.push(cursor);
    }
    return runs;
  } catch {
    return [];
  }
};

const STEP_DAYS: Record<PlanCadence, number> = { hourly: 1 / 24, daily: 1, weekly: 7, monthly: 30 };

/** Same buckets as the server's smart retention: a day for a week, a week for four weeks, a month for a year. */
const smartBucket = (ageDays: number): string | null => {
  if (ageDays < 7) return `d${Math.floor(ageDays)}`;
  if (ageDays < 28) return `w${Math.floor(ageDays / 7)}`;
  if (ageDays < 365) return `m${Math.floor(ageDays / 30)}`;
  return null;
};

export const HORIZON_DAYS = 400;

/**
 * Ages in days (newest first) of the backups that would still exist after running `cadence` for
 * `HORIZON_DAYS` under a retention. The newest backup always stays, as on the server.
 */
export const keptAges = (cadence: PlanCadence, r: PlanRetention): number[] => {
  const step = STEP_DAYS[cadence];
  const ages: number[] = [];
  for (let i = 0; i * step < HORIZON_DAYS; i++) ages.push(i * step);

  const seen = new Set<string>();
  return ages.filter((age, i) => {
    if (r.keepSmart) {
      const bucket = smartBucket(age);
      const drop = i > 0 && (bucket === null || seen.has(bucket));
      if (bucket !== null) seen.add(bucket);
      return !drop;
    }
    if (i === 0) return true;
    return !((r.keepLast > 0 && i >= r.keepLast) || (r.keepDays > 0 && age > r.keepDays));
  });
};
