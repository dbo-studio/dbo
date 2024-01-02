export type ColumnType = {
  felid: string;
  type: string;
};

export type ServerData = {
  columns: ColumnType[];
  rows: any;
};
