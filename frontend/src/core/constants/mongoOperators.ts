import type { FilterOperatorOption } from './pgsqlOperators';

/** The conditions the MongoDB filter builder offers; `mongoQuery.ts` turns each one into a query operator. */
export const MongoFilterConditions: FilterOperatorOption[] = [
  { value: '=', label: '=', requiresValue: true },
  { value: '!=', label: '!=', requiresValue: true },
  { value: '>', label: '>', requiresValue: true },
  { value: '>=', label: '>=', requiresValue: true },
  { value: '<', label: '<', requiresValue: true },
  { value: '<=', label: '<=', requiresValue: true },
  { value: 'CONTAINS', label: 'contains', requiresValue: true },
  { value: 'STARTS', label: 'starts with', requiresValue: true },
  { value: 'ENDS', label: 'ends with', requiresValue: true },
  { value: 'IN', label: 'in (a, b, c)', requiresValue: true },
  { value: 'NOT IN', label: 'not in (a, b, c)', requiresValue: true },
  { value: 'REGEX', label: 'matches regex', requiresValue: true },
  { value: 'EXISTS', label: 'exists', requiresValue: false },
  { value: 'NOT EXISTS', label: 'does not exist', requiresValue: false },
  { value: 'IS NULL', label: 'is null', requiresValue: false },
  { value: 'IS NOT NULL', label: 'is not null', requiresValue: false }
];
