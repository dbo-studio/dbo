export type FilterOperatorOption = {
  value: string;
  label: string;
  requiresValue: boolean;
};

export const PgsqlFilterConditions: FilterOperatorOption[] = [
  { value: '=', label: '=', requiresValue: true },
  { value: '!=', label: '!=', requiresValue: true },
  { value: '<', label: '<', requiresValue: true },
  { value: '>', label: '>', requiresValue: true },
  { value: 'IS NULL', label: 'IS NULL', requiresValue: false },
  { value: 'IS NOT NULL', label: 'IS NOT NULL', requiresValue: false },
  { value: 'LIKE_CONTAINS', label: 'LIKE %value%', requiresValue: true },
  { value: 'LIKE_STARTS', label: 'LIKE value%', requiresValue: true },
  { value: 'LIKE_ENDS', label: 'LIKE %value', requiresValue: true }
];

export const filterOperatorRequiresValue = (operator: string): boolean =>
  PgsqlFilterConditions.find((c) => c.value === operator)?.requiresValue ?? true;

export const PgsqlSorts = ['ASC', 'DESC'];
export const PgsqlFilterNext = ['AND', 'OR'];
