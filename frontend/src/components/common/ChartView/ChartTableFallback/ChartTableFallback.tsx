import ChatDataTable from '@/components/common/AiChatPanel/Messages/ChatDataTable/ChatDataTable';
import { Box } from '@mui/material';
import type { JSX } from 'react';

type Props = {
  rows: Record<string, unknown>[];
  columns: string[];
};

export default function ChartTableFallback({ rows, columns }: Props): JSX.Element {
  return (
    <Box data-testid='ai-chart' data-type='table'>
      <ChatDataTable rows={rows} columns={columns} />
    </Box>
  );
}