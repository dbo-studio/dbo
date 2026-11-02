export type AiAuditEntryType = {
  id: number;
  chatId: number;
  changesetId: number;
  summary: string;
  sql: string;
  status: 'applied' | 'partial' | 'failed';
  error?: string;
  createdAt: string;
};
