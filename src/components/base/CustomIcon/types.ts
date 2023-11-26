import { MouseEventHandler } from "react";

export type sizeTypes = "l" | "m" | "s" | "xs";

export type IconProps = {
  type: keyof typeof IconTypes;
  size?: sizeTypes;
  onClick?: MouseEventHandler | undefined;
  width?: number;
  height?: number;
};

export const IconTypes = {
  user: "user",
  settings: "settings",
  sideLeft: "sideLeft",
  sideBottom: "sideBottom",
  sideRight: "sideRight",
  connection: "connection",
  lock: "lock",
  database: "database",
  refresh: "refresh",
  search: "search",
  sql: "sql",
  arrowDown: "arrowDown",
  arrowRight: "arrowRight",
  arrowLeft: "arrowLeft",
  arrowUp: "arrowUp",
  columnToken: "columnToken",
  grid: "grid",
  gridBlue: "gridBlue",
  filter: "filter",
  sort: "sort",
  code: "code",
  export: "export",
  import: "import",
  close: "close",
  databaseOutline: "databaseOutline",
  columnFillGreen: "columnFillGreen",
  filterBrown: "filterBrown",
  sortBlue: "sortBlue",
  check: "check",
  stop: "stop",
  mines: "mines",
  plus: "plus",
  structure: "structure",
  structureBlue: "structureBlue",
};
