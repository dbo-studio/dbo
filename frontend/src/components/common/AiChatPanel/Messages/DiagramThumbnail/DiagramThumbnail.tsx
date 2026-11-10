import type { SchemaOp } from '@/core/diagram/types';
import { useTheme } from '@mui/material';
import type { JSX } from 'react';

const CELL_W = 92;
const CELL_H = 30;
const GAP_X = 18;
const GAP_Y = 14;
const COLS = 3;

type Point = { x: number; y: number };

/** Schematic of a proposed changeset: new tables as boxes, foreign keys as lines. */
export default function DiagramThumbnail({ ops }: { ops: SchemaOp[] }): JSX.Element | null {
  const theme = useTheme();

  const added = new Set<string>();
  const edges: Array<{ source: string; target: string }> = [];
  for (const op of ops) {
    if (op.op !== 'add') continue;
    if (op.target === 'node') added.add(op.value.name);
    if (op.target === 'edge') edges.push({ source: op.value.source, target: op.value.target });
  }

  // Tables referenced by a new foreign key but not created here are drawn as existing.
  const names = [...added];
  for (const edge of edges) {
    for (const name of [edge.source, edge.target]) {
      if (!names.includes(name)) names.push(name);
    }
  }
  if (names.length === 0) return null;

  const position = new Map<string, Point>(
    names.map((name, index) => [
      name,
      { x: (index % COLS) * (CELL_W + GAP_X), y: Math.floor(index / COLS) * (CELL_H + GAP_Y) }
    ])
  );
  const width = Math.min(names.length, COLS) * (CELL_W + GAP_X) - GAP_X;
  const height = Math.ceil(names.length / COLS) * (CELL_H + GAP_Y) - GAP_Y;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width='100%'
      style={{ maxHeight: 140 }}
      role='img'
      aria-label='Schema changeset preview'
      data-testid='ai-diagram-thumbnail'
    >
      {edges.map((edge) => {
        const from = position.get(edge.source);
        const to = position.get(edge.target);
        if (!from || !to) return null;
        return (
          <line
            key={`${edge.source}->${edge.target}`}
            x1={from.x + CELL_W / 2}
            y1={from.y + CELL_H / 2}
            x2={to.x + CELL_W / 2}
            y2={to.y + CELL_H / 2}
            stroke={theme.palette.divider}
            strokeWidth={1.5}
          />
        );
      })}
      {names.map((name) => {
        const point = position.get(name) as Point;
        const isNew = added.has(name);
        return (
          <g key={name} transform={`translate(${point.x} ${point.y})`}>
            <rect
              width={CELL_W}
              height={CELL_H}
              rx={4}
              fill={theme.palette.background.paper}
              stroke={isNew ? theme.palette.success.main : theme.palette.divider}
              strokeWidth={isNew ? 1.5 : 1}
              strokeDasharray={isNew ? undefined : '3 2'}
            />
            <text
              x={CELL_W / 2}
              y={CELL_H / 2 + 3.5}
              textAnchor='middle'
              fontSize={10}
              fill={theme.palette.text.primary}
            >
              {name.length > 14 ? `${name.slice(0, 13)}…` : name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
