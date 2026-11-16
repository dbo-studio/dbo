import type { FilterType, SortType } from '@/types';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Reads what was typed as the value it most likely means: a number, true/false, null, an ObjectId (24 hex digits),
 * a date (ISO 8601), or text. Wrapping it in double quotes forces text, e.g. "123" or "true".
 */
export function mongoValue(raw: string): unknown {
  const text = raw.trim();
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text) as string;
    } catch {
      return text.slice(1, -1);
    }
  }
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null') return null;
  if (NUMBER.test(text)) return Number(text);
  if (OBJECT_ID.test(text)) return { $oid: text };
  if (ISO_DATE.test(text)) {
    const date = new Date(text.includes('T') || text.length === 10 ? text : text.replace(' ', 'T'));
    if (!Number.isNaN(date.getTime())) return { $date: date.toISOString() };
  }
  return text;
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = (pattern: string, options = ''): unknown => ({ $regularExpression: { pattern, options } });
const list = (raw: string): unknown[] =>
  raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map(mongoValue);

/** One row of the builder as a MongoDB condition, or null while it is incomplete. */
function condition(filter: FilterType): Record<string, unknown> | null {
  const field = filter.column;
  const raw = String(filter.value ?? '');
  if (!field) return null;

  switch (filter.operator) {
    case 'EXISTS':
      return { [field]: { $exists: true } };
    case 'NOT EXISTS':
      return { [field]: { $exists: false } };
    case 'IS NULL':
      return { [field]: null };
    case 'IS NOT NULL':
      return { [field]: { $ne: null } };
  }

  if (raw.trim() === '') return null;

  switch (filter.operator) {
    case '=':
      return { [field]: mongoValue(raw) };
    case '!=':
      return { [field]: { $ne: mongoValue(raw) } };
    case '>':
      return { [field]: { $gt: mongoValue(raw) } };
    case '>=':
      return { [field]: { $gte: mongoValue(raw) } };
    case '<':
      return { [field]: { $lt: mongoValue(raw) } };
    case '<=':
      return { [field]: { $lte: mongoValue(raw) } };
    case 'CONTAINS':
      return { [field]: regex(escapeRegex(raw), 'i') };
    case 'STARTS':
      return { [field]: regex(`^${escapeRegex(raw)}`, 'i') };
    case 'ENDS':
      return { [field]: regex(`${escapeRegex(raw)}$`, 'i') };
    case 'IN':
      return { [field]: { $in: list(raw) } };
    case 'NOT IN':
      return { [field]: { $nin: list(raw) } };
    case 'REGEX':
      return { [field]: regex(raw) };
    default:
      return null;
  }
}

/**
 * The builder's rows as a MongoDB filter document (text). Rows are joined by their AND / OR, with AND binding tighter,
 * like SQL. Inactive and incomplete rows are left out; no rows gives an empty string (every document).
 */
export function buildMongoFilter(filters: FilterType[]): string {
  const groups: Record<string, unknown>[][] = [[]];
  const rows = filters.filter((f) => f.isActive);

  rows.forEach((row, i) => {
    const cond = condition(row);
    if (cond) groups[groups.length - 1].push(cond);
    if (row.next === 'OR' && i < rows.length - 1) groups.push([]);
  });

  const parts = groups
    .filter((group) => group.length > 0)
    .map((group) => (group.length === 1 ? group[0] : { $and: group }));

  if (parts.length === 0) return '';
  return JSON.stringify(parts.length === 1 ? parts[0] : { $or: parts });
}

/** The builder's sort rows as a MongoDB sort document (text), in order; empty string for none. */
export function buildMongoSort(sorts: SortType[]): string {
  const active = sorts.filter((s) => s.isActive && s.column);
  if (active.length === 0) return '';
  return JSON.stringify(Object.fromEntries(active.map((s) => [s.column, s.operator === 'DESC' ? -1 : 1])));
}
