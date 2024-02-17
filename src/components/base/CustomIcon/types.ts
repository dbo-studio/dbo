import { MouseEventHandler } from 'react';

export type sizeTypes = 'l' | 'm' | 's' | 'xs';

export type IconProps = {
  type: keyof typeof IconTypes;
  size?: sizeTypes;
  onClick?: MouseEventHandler | undefined;
  width?: number;
  height?: number;
};

export const IconTypes = {
  user: 'User',
  settings: 'Settings',
  sideLeft: 'PanelLeft',
  sideBottom: 'PanelBottom',
  sideRight: 'PanelRight',
  connection: 'Cable',
  lock: 'Lock',
  database: 'Database',
  refresh: 'RotateCcw',
  search: 'Search',
  sql: 'FileJson',
  arrowDown: 'ChevronUp',
  arrowRight: 'ChevronRight',
  arrowLeft: 'ChevronLeft',
  arrowUp: 'ChevronUp',
  columnToken: 'columnToken',
  grid: 'Grid3x3',
  gridBlue: 'Grid3x3',
  filter: 'filter',
  sort: 'ArrowDownWideNarrow',
  code: 'Code',
  export: 'FileUp',
  import: 'FileDown',
  close: 'X',
  databaseOutline: 'Database',
  columnFillGreen: 'columnFillGreen',
  filterBrown: 'filterBrown',
  sortBlue: 'sortBlue',
  check: 'Check',
  stop: 'Ban',
  mines: 'Minus',
  plus: 'Plus',
  structure: 'Grid3x3',
  structureBlue: 'Grid3x3',
  delete: 'Trash2'
};
