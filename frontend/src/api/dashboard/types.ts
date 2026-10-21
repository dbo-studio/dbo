import type { QuestionType } from '../question/types';

export type DashboardCardType = {
  id: number;
  position: number;
  /** 1 is half the board, 2 the full row. */
  width: 1 | 2;
  question: QuestionType;
};

/** A board of saved reports on one connection. */
export type DashboardType = {
  id: number;
  connectionId: number;
  name: string;
  cards: DashboardCardType[];
};
