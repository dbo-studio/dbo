export const schemaDiagramQueryKey = (
  connectionId: string | number | undefined,
  database: string,
  schema: string,
  focusTables?: string[]
): readonly [string, string | number | undefined, string, string, string[] | undefined] => [
  'schema-diagram',
  connectionId,
  database,
  schema,
  focusTables?.length ? focusTables : undefined
];
