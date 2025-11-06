import api from '@/api';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import type {
  DiagramLayout,
  DiagramNodePosition,
  DiagramRelationship,
  DiagramTable,
  SchemaDiagramResponse,
  SaveRelationshipRequest
} from '@/api/schemaDiagram';
import { Box, Button, CircularProgress, Paper, Toolbar } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  NodeTypes,
  BackgroundVariant,
  Panel,
  SelectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from '@mui/material/styles';
import TableNode from './components/TableNode';
import CreateRelationshipDialog from './components/CreateRelationshipDialog';
import { getLayoutedElements, LayoutDirection } from './utils/layout';
import './SchemaDiagram.css';

const nodeTypes: NodeTypes = {
  tableNode: TableNode
};

export default function SchemaDiagram(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const selectedTab = useSelectedTab();
  const queryClient = useQueryClient();
  const theme = useTheme();

  const selectedTabSchema = selectedTab?.options?.schema;
  const [schema, setSchema] = useState<string>(selectedTabSchema || 'public');
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>(LayoutDirection.TB);
  const [isPanning, setIsPanning] = useState(false);

  // Update schema if tab options change
  useEffect(() => {
    if (selectedTabSchema) {
      setSchema(selectedTabSchema);
    }
  }, [selectedTabSchema]);
  const [createRelationshipDialog, setCreateRelationshipDialog] = useState<{
    open: boolean;
    sourceTable: DiagramTable | null;
    targetTable: DiagramTable | null;
    sourceColumn?: string;
    targetColumn?: string;
  }>({
    open: false,
    sourceTable: null,
    targetTable: null
  });

  const { data, isLoading, error, refetch: refetchDiagram } = useQuery<SchemaDiagramResponse>({
    queryKey: ['schemaDiagram', currentConnection?.id, schema],
    queryFn: async () => {
      if (!currentConnection?.id) throw new Error('No connection');
      return api.schemaDiagram.getDiagram({
        connectionId: currentConnection.id,
        schema: schema || undefined
      });
    },
    enabled: !!currentConnection?.id
  });

  const handleRefreshDiagram = useCallback(() => {
    refetchDiagram();
  }, [refetchDiagram]);

  const { mutateAsync: saveLayout } = useMutation({
    mutationFn: async (layout: DiagramLayout) => {
      if (!currentConnection?.id) throw new Error('No connection');
      await api.schemaDiagram.saveLayout({
        connectionId: currentConnection.id,
        schema: schema,
        layout
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemaDiagram', currentConnection?.id, schema] });
    }
  });

  const { mutateAsync: createRelationship } = useMutation({
    mutationFn: async (data: SaveRelationshipRequest) => {
      await api.schemaDiagram.createRelationship(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemaDiagram', currentConnection?.id, schema] });
      setCreateRelationshipDialog({ open: false, sourceTable: null, targetTable: null });
    }
  });

  // Convert tables to nodes
  const initialNodes = useMemo<Node[]>(() => {
    if (!data?.tables) return [];

    // Check if we have saved layout
    if (data.layout?.nodes && data.layout.nodes.length > 0) {
      return data.tables.map((table) => {
        const savedNode = data.layout!.nodes.find((n) => n.tableId === table.id);
        return {
          id: table.id,
          type: 'tableNode',
          position: savedNode ? { x: savedNode.x, y: savedNode.y } : { x: 0, y: 0 },
          data: { table, onRefresh: handleRefreshDiagram }
        };
      });
    }

    // Auto-layout
    const { nodes } = getLayoutedElements(data.tables, data.relationships || [], layoutDirection);
    return nodes.map((node) => ({
      ...node,
      data: { ...node.data, onRefresh: handleRefreshDiagram }
    }));
  }, [data, layoutDirection, handleRefreshDiagram]);

  // Convert relationships to edges
  const initialEdges = useMemo<Edge[]>(() => {
    if (!data?.relationships) return [];

    return data.relationships.map((rel) => ({
      id: rel.id,
      source: rel.sourceTable,
      target: rel.targetTable,
      sourceHandle: rel.sourceColumn,
      targetHandle: rel.targetColumn,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed
      },
      label: `${rel.sourceColumn} → ${rel.targetColumn}`,
      data: { relationship: rel }
    }));
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return;
      
      const sourceTable = data?.tables.find((t) => t.id === params.source);
      const targetTable = data?.tables.find((t) => t.id === params.target);
      
      if (sourceTable && targetTable) {
        setCreateRelationshipDialog({
          open: true,
          sourceTable,
          targetTable,
          sourceColumn: params.sourceHandle,
          targetColumn: params.targetHandle
        });
      }
    },
    [data]
  );

  // Handle keyboard events for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.code === 'Space' || e.metaKey || e.ctrlKey) {
        setIsPanning(true);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      if (e.code === 'Space' || (!e.metaKey && !e.ctrlKey)) {
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const onNodesDragStop = useCallback(async () => {
    const layout: DiagramLayout = {
      nodes: nodes.map((node) => ({
        tableId: node.id,
        x: node.position.x,
        y: node.position.y
      }))
    };
    await saveLayout(layout);
  }, [nodes, saveLayout]);

  const handleAutoLayout = useCallback(() => {
    if (!data?.tables) return;
    const { nodes: layoutedNodes } = getLayoutedElements(
      data.tables,
      data.relationships || [],
      layoutDirection
    );
    setNodes(layoutedNodes);
  }, [data, layoutDirection, setNodes]);

  if (isLoading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='100%'>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='100%'>
        Error loading schema diagram
      </Box>
    );
  }

  if (!data) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='100%'>
        No data available
      </Box>
    );
  }

  return (
    <Box height='100%' display='flex' flexDirection='column'>
      <Paper elevation={1} sx={{ zIndex: 1 }}>
        <Toolbar variant='dense'>
          <Box display='flex' gap={1} alignItems='center' flex={1}>
            <Button size='small' variant='outlined' onClick={handleAutoLayout}>
              Auto Layout
            </Button>
            <Button
              size='small'
              variant={layoutDirection === LayoutDirection.TB ? 'contained' : 'outlined'}
              onClick={() => setLayoutDirection(LayoutDirection.TB)}
            >
              Top-Bottom
            </Button>
            <Button
              size='small'
              variant={layoutDirection === LayoutDirection.LR ? 'contained' : 'outlined'}
              onClick={() => setLayoutDirection(LayoutDirection.LR)}
            >
              Left-Right
            </Button>
          </Box>
        </Toolbar>
      </Paper>
      <Box flex={1} position='relative' sx={{ backgroundColor: 'background.default' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDragStop={onNodesDragStop}
          nodeTypes={nodeTypes}
          fitView
          panOnDrag={isPanning}
          panOnScroll={true}
          selectionOnDrag={true}
          selectionMode={SelectionMode.Full}
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode={['Meta', 'Control']}
          onPaneContextMenu={(e) => e.preventDefault()}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={2}
          onMoveStart={() => setIsPanning(false)}
          onMove={(_, viewport) => {
            // Enable panning only when space or command key is pressed
            const isSpaceOrCmd = false; // Will be handled by keyboard events
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={theme.palette.mode === 'dark' ? '#424242' : '#e0e0e0'}
          />
          <Controls
            style={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`
            }}
          />
          <MiniMap
            style={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`
            }}
            nodeColor={(node) => {
              if (node.selected) {
                return theme.palette.primary.main;
              }
              return theme.palette.mode === 'dark' ? '#424242' : '#e0e0e0';
            }}
            maskColor={theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
            pannable
            zoomable
          />
          <Panel position='top-right' style={{ padding: '10px' }}>
            <Box
              sx={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                p: 1,
                fontSize: '0.75rem',
                color: 'text.secondary'
              }}
            >
              Hold <strong>Space</strong> or <strong>Cmd/Ctrl</strong> + Drag to pan
            </Box>
          </Panel>
        </ReactFlow>
      </Box>
      {currentConnection?.id && (
        <CreateRelationshipDialog
          open={createRelationshipDialog.open}
          onClose={() => setCreateRelationshipDialog({ open: false, sourceTable: null, targetTable: null })}
          onSubmit={createRelationship}
          sourceTable={createRelationshipDialog.sourceTable}
          targetTable={createRelationshipDialog.targetTable}
          sourceColumn={createRelationshipDialog.sourceColumn}
          targetColumn={createRelationshipDialog.targetColumn}
          connectionId={currentConnection.id}
        />
      )}
    </Box>
  );
}

