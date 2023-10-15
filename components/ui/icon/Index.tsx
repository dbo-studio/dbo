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
};

type sizeTypes = "m" | "s";

interface IconProps {
  type: keyof typeof iconTypes;
  size?: sizeTypes;
}

export default function Icon({ type, size = "s" }: IconProps) {
  return <img src={`/icons/${type}.svg`} alt={type} width={16} height={16} />;
}
