'use no memo';

import EmptyState from '@/components/base/EmptyState/EmptyState';
import { openDiagramSourceSidebar } from '@/core/diagram/openDiagramSource';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import type { DiagramTabType } from '@/types/Tab';
import { CircularProgress, useTheme } from '@mui/material';
import { Background, ReactFlow, ReactFlowProvider, type Node } from '@xyflow/react';
import { type JSX, useEffect, useState } from 'react';
import { DiagramCanvasStyled, DiagramLoadingStyled, DiagramPanelStyled } from './Diagram.styled';
import DiagramControls from './DiagramControls';
import DiagramToolbar from './DiagramToolbar/DiagramToolbar';
import { useDiagramFlow } from './hooks/useDiagramFlow';
import { useDiagramGraph } from './hooks/useDiagramGraph';
import TableNode from './TableNode/TableNode';
import '@xyflow/react/dist/style.css';

const nodeTypes = { table: TableNode };
const SEARCH_DEBOUNCE_MS = 150;

export default function Diagram(): JSX.Element {
  return (
    <ReactFlowProvider>
      <DiagramCanvas />
    </ReactFlowProvider>
  );
}

function DiagramCanvas(): JSX.Element {
  const theme = useTheme();
  const selectedTab = useSelectedTab<DiagramTabType>();
  const currentConnection = useCurrentConnection();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return (): void => window.clearTimeout(timer);
  }, [searchInput]);

  const connectionId = currentConnection?.id;
  const database = selectedTab?.database ?? '';
  const schema = selectedTab?.schema ?? '';
  const focusTable = selectedTab?.focusTable;

  const { viewGraph, isLoading, activeNodeId, highlightedIds, shownNodeIds } = useDiagramGraph({
    connectionId,
    database,
    schema,
    focusTable,
    enabled: Boolean(connectionId && selectedTab),
    selectedNodeId
  });

  const { nodes, edges, onNodesChange, onEdgesChange, autoLayout, fit, exportImage } = useDiagramFlow({
    connectionId,
    database,
    schema,
    viewGraph,
    shownNodeIds,
    highlightedIds,
    activeNodeId,
    search,
    edgeStroke: theme.palette.text.disabled,
    exportBg: theme.palette.background.default
  });

  if (!selectedTab) {
    return <></>;
  }

  return (
    <DiagramPanelStyled data-testid='diagram-panel'>
      <DiagramToolbar
        search={searchInput}
        onSearch={setSearchInput}
        onAutoLayout={autoLayout}
        onFit={fit}
        onOpenSource={openDiagramSourceSidebar}
        onExportPng={(): void => {
          void exportImage('png');
        }}
        onExportSvg={(): void => {
          void exportImage('svg');
        }}
      />
      <DiagramCanvasStyled data-testid='diagram-canvas'>
        {isLoading && viewGraph.nodes.length === 0 ? (
          <DiagramLoadingStyled>
            <CircularProgress size={30} />
          </DiagramLoadingStyled>
        ) : viewGraph.nodes.length === 0 ? (
          <EmptyState
            icon='network'
            title={locales.diagram_empty_title}
            description={locales.diagram_empty_description}
          />
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_event, node: Node): void => setSelectedNodeId(node.id)}
            onPaneClick={(): void => setSelectedNodeId(null)}
            nodesConnectable={false}
            nodesDraggable
            onlyRenderVisibleElements
            deleteKeyCode={null}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} color={theme.palette.divider} />
            <DiagramControls />
          </ReactFlow>
        )}
      </DiagramCanvasStyled>
    </DiagramPanelStyled>
  );
}
