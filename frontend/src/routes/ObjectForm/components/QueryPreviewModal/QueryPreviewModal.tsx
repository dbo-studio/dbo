import Modal from '@/components/base/Modal/Modal';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import React from 'react';

type QueryPreviewModalProps = {
  open: boolean;
  queries: string[];
  isExecuting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function QueryPreviewModal({
  open,
  queries,
  isExecuting,
  onCancel,
  onConfirm
}: QueryPreviewModalProps): React.JSX.Element {
  const formattedQueries = queries
    .filter((query) => query.trim() !== '')
    .map((query, index) => `-- ${index + 1}\n${query}`)
    .join('\n\n');

  return (
    <Modal open={open} title={locales.query_preview} onClose={onCancel} padding='16px'>
      <Box maxHeight={400} overflow='auto' mb={2}>
        <SyntaxHighlighter value={formattedQueries} />
      </Box>
      <Stack direction='row' justifyContent='flex-end' spacing={1}>
        <Button variant='text' size='small' disabled={isExecuting} onClick={onCancel}>
          {locales.cancel}
        </Button>
        <Button
          variant='contained'
          size='small'
          disabled={isExecuting || queries.length === 0}
          onClick={onConfirm}
          startIcon={isExecuting ? <CircularProgress size={14} color='inherit' /> : undefined}
        >
          {locales.object_form_execute_queries}
        </Button>
      </Stack>
    </Modal>
  );
}
