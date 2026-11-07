import api from '@/api';
import { useQuery } from '@tanstack/react-query';
import { schemaDiagramQueryKey } from './queryKey';

type Args = {
  connectionId: string | number | undefined;
  database: string;
  schema: string;
  focusTables?: string[];
  enabled: boolean;
};

export function useSchemaDiagramQuery({ connectionId, database, schema, focusTables, enabled }: Args) {
  return useQuery({
    queryKey: schemaDiagramQueryKey(connectionId, database, schema, focusTables),
    queryFn: ({ signal }) =>
      api.schema.getDiagram(
        {
          connectionId: connectionId ?? 0,
          database: database || undefined,
          schema: schema || undefined,
          tables: focusTables?.length ? focusTables : undefined
        },
        signal
      ),
    enabled
  });
}
