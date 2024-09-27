import type { MouseEventHandler } from 'react';

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
  filter: 'Filter',
  sort: 'ArrowDownWideNarrow',
  code: 'Code',
  export: 'FileUp',
  import: 'FileDown',
  close: 'X',
  databaseOutline: 'Database',
  sortBlue: 'sortBlue',
  check: 'Check',
  stop: 'Ban',
  mines: 'Minus',
  plus: 'Plus',
  structure: 'Grid3x3',
  structureBlue: 'Grid3x3',
  delete: 'Trash2',
  pen: 'PenLine',
  play: 'Play',
  copy: 'Copy',
  ellipsisVertical: 'EllipsisVertical',
  save: 'Save',
  wand_sparkles: 'WandSparkles',
  pickaxe: 'Pickaxe',
  light: 'Sun',
  dark: 'Moon',
  sheet: 'Sheet',
  databaseZap: 'DatabaseZap'
};
