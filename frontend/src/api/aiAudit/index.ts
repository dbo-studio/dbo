import { api } from '@/core/api';
import type { AiAuditEntryType } from '@/types/AiAudit';

export const getAuditEntries = async (connectionId: number): Promise<AiAuditEntryType[]> => {
  return (
    await api.get<{ data: AiAuditEntryType[] }>('/ai/audit', {
      params: { connectionId, page: 1, count: 50 }
    })
  ).data.data;
};
