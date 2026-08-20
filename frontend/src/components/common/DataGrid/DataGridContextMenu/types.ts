export type DataGridContextTarget =
  | { type: 'empty' }
  | { type: 'cell'; columnName: string }
  | { type: 'header'; columnName: string };
