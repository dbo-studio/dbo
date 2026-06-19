import Modal from '@/components/base/Modal/Modal';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { Box, Button, CircularProgress } from '@mui/material';
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
    <Modal open={open} title={locales.query_preview} onClose={onCancel}>
      <Box display={'flex'} flexDirection={'column'} flex={1}>
        <Box flex={1}>
          <SyntaxHighlighter value={formattedQueries} />
        </Box>
        <Box display={'flex'} mt={2} justifyContent={'space-between'}>
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
        </Box>
      </Box>
    </Modal>
  );
}
