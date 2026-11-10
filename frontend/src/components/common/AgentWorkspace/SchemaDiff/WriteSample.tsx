import api from '@/api';
import ChatDataTable from '@/components/common/AiChatPanel/Messages/ChatDataTable/ChatDataTable';
import locales from '@/locales';
import type { AiChangeset } from '@/types';
import { Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX } from 'react';

/** The rows a pending data change touches right now, in the lite grid. */
export default function WriteSample({
  changeset,
  position
}: {
  changeset: AiChangeset;
  position: number;
}): JSX.Element | null {
  const { data } = useQuery({
    // The ops are part of the key: the count is read again after an edit.
    queryKey: ['ai-write-preview', changeset, position],
    queryFn: () => api.aiChat.getWritePreview(changeset.chatId, changeset.id, position)
  });

  if (!data) return null;

  return (
    <div data-testid='ai-write-sample'>
      <Typography variant='caption' data-testid='ai-write-count'>
        {locales.ai_table_rows.replace('{n}', String(data.affectedRows))}
      </Typography>
      {data.rows.length > 0 && (
        <>
          <Typography variant='caption' color='textSubdued' sx={{ display: 'block' }}>
            {locales.ai_changes_sample}
          </Typography>
          <ChatDataTable rows={data.rows} columns={data.columns} query={data.sampleQuery} />
        </>
      )}
    </div>
  );
}
