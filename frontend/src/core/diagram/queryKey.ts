export const schemaDiagramQueryKey = (
  connectionId: string | number | undefined,
  database: string,
  schema: string,
  focusTable?: string
): readonly [string, string | number | undefined, string, string, string[] | undefined] => [
  'schema-diagram',
  connectionId,
  database,
  schema,
  focusTable ? [focusTable] : undefined
];
