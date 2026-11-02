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
  /** Viewers may change the report filters. */
  allowFilters: boolean;
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

export type CreateShareRequestType = { expiresAt?: string; password?: string; allowFilters?: boolean };

export type ShareVisitType = { viewedAt: string; outcome: 'ok' | 'password_required' | 'wrong_password'; ip: string };

export type UpdateShareRequestType = {
  expiresAt?: string;
  clearExpiry?: boolean;
  /** Absent leaves it, empty removes it. */
  password?: string;
  allowFilters?: boolean;
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

/** A filter a viewer of a shared page may set. */
export type PublicFilterType = { name: string; type: string; value: string };

export type PublicDashboardType = {
  name: string;
  generatedAt: string;
  filters: PublicFilterType[];
  cards: PublicCardType[];
};

export type SubscriptionKind = 'email' | 'webhook';
export type SubscriptionFrequency = 'hourly' | 'daily' | 'weekly';

/** A schedule that sends a board's snapshot by email or to a webhook. */
export type SubscriptionType = {
  id: number;
  kind: SubscriptionKind;
  target: string;
  hasSecret: boolean;
  frequency: SubscriptionFrequency;
  hour: number;
  minute: number;
  /** 0 is Sunday. */
  weekday: number;
  timezone: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastStatus: '' | 'ok' | 'failed';
  lastError: string;
  consecutiveFailures: number;
};

export type SubscriptionListType = {
  /** False until an admin sets the outgoing mail account. */
  emailConfigured: boolean;
  items: SubscriptionType[];
};

export type SubscriptionRequestType = {
  kind: SubscriptionKind;
  target: string;
  /** Webhook signing secret: absent keeps it, empty removes it. */
  secret?: string;
  frequency: SubscriptionFrequency;
  hour: number;
  minute: number;
  weekday: number;
  timezone: string;
  enabled?: boolean;
};

export type SubscriptionRunType = {
  id: number;
  startedAt: string;
  finishedAt: string;
  status: 'ok' | 'failed';
  error: string;
  reports: number;
  manual: boolean;
};

export type SmtpSettingsType = {
  host: string;
  port: number;
  username: string;
  hasPassword: boolean;
  fromAddress: string;
  security: 'starttls' | 'tls' | 'none';
  configured: boolean;
};

export type SmtpRequestType = Omit<SmtpSettingsType, 'hasPassword' | 'configured'> & { password?: string };
