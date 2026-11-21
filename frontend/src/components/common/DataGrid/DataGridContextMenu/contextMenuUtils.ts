import { PgsqlFilterConditions } from '@/core/constants';
import locales from '@/locales';
import type { ColumnType } from '@/types';

/** A fresh [] per call makes the selector's snapshot unstable and loops React when the store has no columns. */
export const NO_COLUMNS: ColumnType[] = [];

export const filterOperator = (value: string): string =>
  PgsqlFilterConditions.find((c) => c.value === value)?.value ?? value;

export function writeDisabledReason(canEdit: boolean, safeModeBlocks: boolean): string | undefined {
  if (!canEdit) {
    return locales.grid_menu_read_only;
  }
  if (safeModeBlocks) {
    return locales.grid_menu_safe_mode;
  }
  return undefined;
}