import api from '@/api';
import type { DashboardType } from '@/api/dashboard/types';
import { CHART_TYPES } from '@/core/charts/chartSpec';
import { tools } from '@/core/utils';
import * as v from 'valibot';

/** A board as a file: its name and, per card, the report's query and chart. Ids stay out, so it imports anywhere. */
const boardFileSchema = v.object({
  version: v.literal(1),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
  cards: v.pipe(
    v.array(
      v.object({
        width: v.picklist([1, 2]),
        question: v.object({
          name: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
          sql: v.pipe(v.string(), v.minLength(1), v.maxLength(20000)),
          database: v.optional(v.string()),
          schema: v.optional(v.string()),
          chart: v.object({
            type: v.picklist(CHART_TYPES),
            x: v.optional(v.string()),
            y: v.array(v.string()),
            stacked: v.optional(v.boolean())
          }),
          params: v.optional(v.record(v.string(), v.string()))
        })
      })
    ),
    v.maxLength(100)
  )
});

type BoardFile = v.InferOutput<typeof boardFileSchema>;

export function exportBoard(board: DashboardType): void {
  const file: BoardFile = {
    version: 1,
    name: board.name,
    cards: board.cards.map(({ width, question }) => ({
      width,
      question: {
        name: question.name,
        sql: question.sql,
        database: question.database,
        schema: question.schema,
        chart: question.chart,
        params: question.params
      }
    }))
  };

  tools.fileDownload(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), `${board.name}.dashboard.json`);
}

/** Recreates a board file on a connection: each card's report is saved anew, then pinned in order. */
export async function importBoard(connectionId: number, text: string): Promise<DashboardType> {
  const file = v.parse(boardFileSchema, JSON.parse(text));
  let board = await api.dashboard.createDashboard(connectionId, file.name);

  for (const card of file.cards) {
    const question = await api.question.createQuestion({ connectionId, ...card.question });
    board = await api.dashboard.pinToDashboard(board.id, question.id);
    if (card.width === 2) {
      const pinned = board.cards.find((item) => item.question.id === question.id);
      if (pinned) board = await api.dashboard.resizeCard(board.id, pinned.id, 2);
    }
  }

  return board;
}
