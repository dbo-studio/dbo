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

type sizeTypes = "l" | "m" | "s" | "xs";

interface IconProps {
  type: keyof typeof iconTypes;
  size?: sizeTypes;
  onClick?: Function;
  width?: number;
  height?: number;
}

const sizes = {
  l: {
    width: 30,
    height: 30,
  },
  m: {
    width: 24,
    height: 24,
  },
  s: {
    width: 16,
    height: 16,
  },
  xs: {
    width: 11,
    height: 11,
  },
};

export default function Icon({
  type,
  size = "s",
  width,
  height,
  onClick,
}: IconProps) {
  if (width) {
    sizes[size].width = width;
  }
  if (height) {
    sizes[size].height = height;
  }

  return (
    <img
      onClick={onClick}
      src={`/icons/${type}.svg`}
      alt={type}
      width={sizes[size].width}
      height={sizes[size].height}
    />
  );
}
