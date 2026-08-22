import api from '@/api';
import { applyOps, neighborIds } from '@/core/diagram/applyOps';
import { EMPTY_DIAGRAM_GRAPH, type ViewGraph } from '@/core/diagram/types';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

type Args = {
  connectionId: string | number | undefined;
  database: string;
  schema: string;
  focusTable?: string;
  enabled: boolean;
  selectedNodeId: string | null | undefined;
};

export function useDiagramGraph({
  connectionId,
  database,
  schema,
  focusTable,
  enabled,
  selectedNodeId
}: Args): {
  viewGraph: ViewGraph;
  isLoading: boolean;
  activeNodeId: string | null;
  highlightedIds: Set<string>;
  shownNodeIds: Set<string>;
} {
  const seedTables = focusTable ? [focusTable] : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['schema-diagram', connectionId, database, schema, seedTables],
    queryFn: ({ signal }) =>
      api.schema.getDiagram(
        {
          connectionId: connectionId ?? 0,
          database: database || undefined,
          schema: schema || undefined,
          tables: seedTables
        },
        signal
      ),
    enabled
  });

  const viewGraph = useMemo(() => applyOps(data ?? EMPTY_DIAGRAM_GRAPH, []), [data]);

  // Backend expands focusTable by one FK hop; show everything returned.
  const shownNodeIds = useMemo(() => new Set(viewGraph.nodes.map((node) => node.id)), [viewGraph.nodes]);

  const focusedId = viewGraph.nodes.find((node) => node.name === focusTable)?.id ?? null;
  const activeNodeId = selectedNodeId === undefined ? focusedId : selectedNodeId;

  const highlightedIds = useMemo(() => {
    if (!activeNodeId) {
      return new Set<string>();
    }
    return neighborIds(viewGraph, activeNodeId);
  }, [activeNodeId, viewGraph]);

  return {
    viewGraph,
    isLoading,
    activeNodeId,
    highlightedIds,
    shownNodeIds
  };
}
