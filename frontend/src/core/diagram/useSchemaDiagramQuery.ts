import api from '@/api';
import { useQuery } from '@tanstack/react-query';
import { schemaDiagramQueryKey } from './queryKey';

type Args = {
  connectionId: string | number | undefined;
  database: string;
  schema: string;
  focusTable?: string;
  enabled: boolean;
};

export function useSchemaDiagramQuery({ connectionId, database, schema, focusTable, enabled }: Args) {
  return useQuery({
    queryKey: schemaDiagramQueryKey(connectionId, database, schema, focusTable),
    queryFn: ({ signal }) =>
      api.schema.getDiagram(
        {
          connectionId: connectionId ?? 0,
          database: database || undefined,
          schema: schema || undefined,
          tables: focusTable ? [focusTable] : undefined
        },
        signal
      ),
    enabled
  });
}
