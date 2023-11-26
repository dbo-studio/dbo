export interface ServerColumn {
  felid: string;
  type: string;
}

export interface ServerData {
  columns: ServerColumn[];
  rows: any;
}
