import { MouseEventHandler } from "react";

export type sizeTypes = "l" | "m" | "s" | "xs";

export type IconProps = {
  type: keyof typeof iconTypes;
  size?: sizeTypes;
  onClick?: MouseEventHandler | undefined;
  width?: number;
  height?: number;
};

const iconTypes = {
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
};
