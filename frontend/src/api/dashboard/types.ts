import type { ChartSpec } from '@/core/charts/chartSpec';
import type { QuestionResultType, QuestionType } from '../question/types';

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

/** A link that shows a board read-only to anyone who has it. */
export type DashboardShareType = {
  id: number;
  createdAt: string;
  expiresAt: string | null;
  revoked: boolean;
  hasPassword: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  /** The secret part of the link; only sent when the link is made. */
  token?: string;
};

export type DashboardShareListType = {
  /** False on the desktop app, where nobody else can reach a link. */
  available: boolean;
  items: DashboardShareType[];
};

export type CreateShareRequestType = { expiresAt?: string; password?: string };

export type UpdateShareRequestType = {
  expiresAt?: string;
  clearExpiry?: boolean;
  /** Absent leaves it, empty removes it. */
  password?: string;
};

/** One report of a shared board: what to draw and its rows, never its SQL. */
export type PublicCardType = {
  id: number;
  name: string;
  width: 1 | 2;
  chart: ChartSpec;
  result?: QuestionResultType;
  error?: string;
};

export type PublicDashboardType = { name: string; generatedAt: string; cards: PublicCardType[] };
