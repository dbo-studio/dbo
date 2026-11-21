import type { SubscriptionType } from '@/api/dashboard/types';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';

export const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const pad = (value: number): string => String(value).padStart(2, '0');

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6].map((day): SelectInputOption => ({
  value: String(day),
  // 2024-01-07 is a Sunday.
  label: new Date(2024, 0, 7 + day).toLocaleDateString(undefined, { weekday: 'long' })
}));

export const describeSubscription = (sub: SubscriptionType): string => {
  const time = `${pad(sub.hour)}:${pad(sub.minute)}`;
  const when =
    sub.frequency === 'hourly'
      ? locales.schedule_hourly_at.replace('{minute}', pad(sub.minute))
      : sub.frequency === 'daily'
        ? locales.schedule_daily_at.replace('{time}', time)
        : locales.schedule_weekly_at.replace('{day}', WEEKDAYS[sub.weekday].label).replace('{time}', time);

  return `${when} (${sub.timezone})`;
};
