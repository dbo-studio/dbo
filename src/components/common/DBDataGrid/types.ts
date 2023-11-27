export type ServerColumn = {
  felid: string;
  type: string;
};

export type ServerData = {
  columns: ServerColumn[];
  rows: any;
};
