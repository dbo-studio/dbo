interface ServerColumn {
  felid: string;
  type: string;
}

interface ServerData {
  columns: ServerColumn[];
  rows: any;
}
