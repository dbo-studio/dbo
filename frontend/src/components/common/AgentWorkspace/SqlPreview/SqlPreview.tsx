import api from '@/api';
import SqlBlock from '@/components/common/SqlBlock/SqlBlock';
import type { AiChangeset } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { type JSX } from 'react';

/** Read-only SQL the server would run for the ops still open. */
export default function SqlPreview({ changeset }: { changeset: AiChangeset }): JSX.Element {
  const { data: queries = [] } = useQuery({
    // Op statuses are part of the key, so the SQL follows accept/reject.
    queryKey: ['ai-changeset-sql', changeset],
    queryFn: () => api.aiChat.previewChangeset(changeset)
  });

  return <SqlBlock queries={queries} testIdPrefix='ai-sql' />;
}
