import type { DashboardShareType } from '@/api/dashboard/types';
import locales from '@/locales';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const CUSTOM = -1;
export const PRESETS = [
  { label: locales.share_expiry_1d, days: 1 },
  { label: locales.share_expiry_7d, days: 7 },
  { label: locales.share_expiry_30d, days: 30 },
  { label: locales.share_expiry_never, days: 0 }
];
/** The end of the picked day in the user's time zone, as the server wants it. */
export const endOfDay = (date: string): string => new Date(`${date}T23:59:59`).toISOString();
export const toDateInput = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('sv') : '');
export const inDays = (days: number): string => new Date(Date.now() + days * DAY_MS).toLocaleDateString('sv');

export const shareStatus = (share: DashboardShareType): 'revoked' | 'expired' | 'active' =>
  share.revoked ? 'revoked' : share.expiresAt && new Date(share.expiresAt) <= new Date() ? 'expired' : 'active';