import api from '@/api';
import { applyOps } from '@/core/diagram/applyOps';
import { layoutTableNodes, tableNodeHeight } from '@/core/diagram/layout';
import { EMPTY_DIAGRAM_GRAPH, type DiagramStatus } from '@/core/diagram/types';
import locales from '@/locales';
import { useChangesetStore } from '@/store/changesetStore/changeset.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { AiChangeset } from '@/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, Button, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';
import { TabMode } from '@/core/enums';
import { useAiStore } from '@/store/aiStore/ai.store';
import { keyframes } from '@mui/material';

const NODE_WIDTH = 280;
const HEADER = 48;
const ROW = 26;
const GAP = 40;

const appear = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: none; }
`;

type Point = { x: number; y: number };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 1.25;
const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** The tables a changeset touches and their foreign key neighbours, with the pending changes drawn on them. */
export default function MiniDiagram({ changeset }: { changeset: AiChangeset }): JSX.Element {
  const theme = useTheme();
  const tables = [...new Set(changeset.ops.map((op) => op.table).filter(Boolean))];
  // A database that does not exist yet has nothing to read.
  const isNewDatabase = changeset.ops.some((op) => op.op === 'create_database');

  const { data: base } = useQuery({
    queryKey: ['ai-mini-diagram', changeset.connectionId, changeset.database, changeset.schema, tables],
    queryFn: () =>
      api.schema.getDiagram({
        connectionId: changeset.connectionId,
        database: changeset.database,
        schema: changeset.schema,
        tables
      }),
    enabled: !isNewDatabase,
    // Keep drawing the last schema while the next table loads, so the canvas grows instead of blinking.
    placeholderData: keepPreviousData
  });

  const graph = useMemo(
    () => applyOps(base ?? EMPTY_DIAGRAM_GRAPH, changeset.diagramOps),
    [base, changeset.diagramOps]
  );
  const laidOut = useMemo(
    () =>
      layoutTableNodes(
        graph.nodes.map((node) => ({ id: node.id, position: { x: 0, y: 0 }, data: { columns: node.columns } })),
        graph.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
        {}
      ),
    [graph]
  );

  // Tables already on the canvas keep their place as the agent adds more; only new tables get a
  // fresh spot, moved right of the rest when the fresh layout would put them on top of one.
  const [placed, setPlaced] = useState<Record<string, Point>>({});
  const missing = laidOut.filter((node) => !placed[node.id]);
  if (missing.length > 0) {
    const next = { ...placed };
    const taken = Object.values(placed);
    let right = Math.max(0, ...taken.map((point) => point.x + NODE_WIDTH + GAP));
    for (const node of missing) {
      const overlaps = taken.some(
        (point) => Math.abs(point.x - node.position.x) < NODE_WIDTH + GAP && Math.abs(point.y - node.position.y) < 160
      );
      next[node.id] = overlaps ? { x: right, y: node.position.y } : node.position;
      if (overlaps) right += NODE_WIDTH + GAP;
      taken.push(next[node.id]);
    }
    setPlaced(next);
  }
  const nodes = laidOut.map((node) => ({ ...node, position: placed[node.id] ?? node.position }));

  const addToContext = (name: string): void => {
    const { context, updateContext } = useAiStore.getState();
    if (!context.tables.includes(name)) updateContext({ ...context, tables: [...context.tables, name] });
  };

  const color = (status: DiagramStatus): string =>
    ({
      added: theme.palette.success.main,
      changed: theme.palette.warning.main,
      removed: theme.palette.error.main,
      unchanged: theme.palette.divider
    })[status];
  const box = (id: string) => {
    const node = nodes.find((item) => item.id === id);
    const view = graph.nodes.find((item) => item.id === id);
    return { x: node?.position.x ?? 0, y: node?.position.y ?? 0, height: tableNodeHeight(view?.columns.length ?? 0) };
  };

  const width = Math.max(...nodes.map((node) => node.position.x + NODE_WIDTH), NODE_WIDTH);
  const height = Math.max(...graph.nodes.map((node) => box(node.id).y + box(node.id).height), HEADER);

  // Fit to the canvas width until the user zooms; the picked zoom then stays as tables are added.
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoom, setZoom] = useState<number>();
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fit = viewportWidth > 0 ? clampZoom(Math.min(1, viewportWidth / (width + 24))) : 1;
  const scale = zoom ?? fit;
  const fitRef = useRef(fit);
  fitRef.current = fit;
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    // Ctrl/⌘ + wheel (and trackpad pinch) zooms, like the app's diagram. Passive React listeners cannot stop the page zoom.
    const onWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setZoom((current) => clampZoom((current ?? fitRef.current) * factor));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const open = (): void => {
    // The full diagram is a tab of the app, under the workstation: leave the workstation to show it.
    useSettingStore.getState().updateUI({ agentWorkspaceOpen: false });
    useChangesetStore.getState().stage(changeset);
    useTabStore.getState().addDiagramTab({ database: changeset.database ?? '', schema: changeset.schema ?? '' });
  };

  return (
    <Box data-testid='ai-mini-diagram' data-tables={graph.nodes.length}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant='text' onClick={open} data-testid='ai-mini-diagram-open'>
          {locales.ai_changes_open_diagram}
        </Button>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 'auto', order: 1 }}>
          <Tooltip title={locales.ai_diagram_zoom_out}>
            <IconButton onClick={() => setZoom(clampZoom(scale / ZOOM_STEP))} data-testid='ai-mini-diagram-zoom-out'>
              <CustomIcon type='mines' size='xs' />
            </IconButton>
          </Tooltip>
          <Tooltip title={locales.ai_diagram_zoom_fit}>
            <Button
              color='inherit'
              onClick={() => setZoom(undefined)}
              sx={{ minWidth: 48, px: 0.5 }}
              data-testid='ai-mini-diagram-zoom'
            >
              {Math.round(scale * 100)}%
            </Button>
          </Tooltip>
          <Tooltip title={locales.ai_diagram_zoom_in}>
            <IconButton onClick={() => setZoom(clampZoom(scale * ZOOM_STEP))} data-testid='ai-mini-diagram-zoom-in'>
              <CustomIcon type='plus' size='xs' />
            </IconButton>
          </Tooltip>
        </Box>
        {(['added', 'changed', 'removed', 'unchanged'] as const).map((status) => (
          <Box key={status} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, border: 2, borderColor: color(status) }} />
            <Typography variant='caption' color='textSubdued'>
              {locales[`ai_canvas_legend_${status}`]}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box ref={viewportRef} sx={{ overflow: 'auto', maxHeight: '70vh' }}>
        <svg
          viewBox={`0 0 ${width + 24} ${height + 24}`}
          width={(width + 24) * scale}
          height={(height + 24) * scale}
          role='img'
          data-zoom={scale.toFixed(2)}
        >
          {graph.edges.map((edge) => {
            const from = box(edge.source);
            const to = box(edge.target);
            return (
              <line
                key={edge.id}
                x1={from.x + NODE_WIDTH / 2 + 12}
                y1={from.y + from.height / 2 + 12}
                x2={to.x + NODE_WIDTH / 2 + 12}
                y2={to.y + to.height / 2 + 12}
                stroke={color(edge.status === 'unchanged' ? 'unchanged' : edge.status)}
                strokeWidth={1.5}
              />
            );
          })}
          {graph.nodes.map((node) => {
            const { x, y, height: h } = box(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${x + 12} ${y + 12})`}
                data-testid='ai-mini-diagram-node'
                data-status={node.status}
                data-table={node.name}
                style={{ cursor: 'pointer' }}
                onClick={() => addToContext(node.name)}
                onDoubleClick={() =>
                  useTabStore.getState().addObjectTab(node.name, node.id, 'editTable', TabMode.Object)
                }
              >
                <title>{locales.ai_canvas_table_hint}</title>
                {/* Plays once when a table first appears; tables already drawn keep their element. */}
                <g style={{ animation: `${appear} 280ms ease-out`, transformOrigin: 'center' }}>
                  <rect
                    width={NODE_WIDTH}
                    height={h}
                    rx={6}
                    fill={theme.palette.background.paper}
                    stroke={color(node.status)}
                    strokeWidth={node.status === 'unchanged' ? 1 : 2}
                  />
                  <text
                    x={12}
                    y={HEADER / 2 + 4}
                    fontSize={theme.typography.subtitle2.fontSize}
                    fill={theme.palette.text.primary}
                  >
                    {node.name}
                  </text>
                  {node.columns.map((column, index) => (
                    <text
                      key={column.name}
                      x={12}
                      y={HEADER + index * ROW + ROW / 2 + 4}
                      fontSize={theme.typography.caption.fontSize as number}
                      fill={column.status === 'unchanged' ? theme.palette.text.secondary : color(column.status)}
                      textDecoration={column.status === 'removed' ? 'line-through' : undefined}
                    >
                      {column.name} {column.dataType}
                      {column.isPrimaryKey ? ' PK' : ''}
                    </text>
                  ))}
                </g>
              </g>
            );
          })}
        </svg>
      </Box>
    </Box>
  );
}
