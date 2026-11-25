export type CliRunRequest = { connectionId: number; input: string; confirmed?: boolean; database?: string };

export type CliResult = {
  kind: 'table' | 'value';
  engine: 'sql' | 'nosql';
  columns?: string[];
  rows?: unknown[][];
  output?: unknown;
  rowCount: number;
  truncated: boolean;
};
