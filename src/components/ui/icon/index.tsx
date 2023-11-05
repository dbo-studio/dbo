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
};

type sizeTypes = "m" | "s" | "xs";

interface IconProps {
  type: keyof typeof iconTypes;
  size?: sizeTypes;
  onClick?: Function;
}

export default function Icon({ type, size = "s", onClick }: IconProps) {
  var width = 16;
  var height = 16;

  if (size == "xs") {
    width = 11;
    height = 11;
  }

  return (
    <img
      onClick={onClick}
      src={`/icons/${type}.svg`}
      alt={type}
      width={width}
      height={height}
    />
  );
}
