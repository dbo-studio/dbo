import Modal from '@/components/base/Modal/Modal';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { Box, Button, CircularProgress } from '@mui/material';
import React from 'react';
import { QueryPreviewActionsStyled, QueryPreviewContentStyled } from './QueryPreviewModal.styled';

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
      <QueryPreviewContentStyled data-testid='object-form-preview-modal'>
        <Box sx={{ flex: 1 }}>
          <SyntaxHighlighter value={formattedQueries} />
        </Box>
        <QueryPreviewActionsStyled>
          <Button
            variant='text'
            size='small'
            disabled={isExecuting}
            onClick={onCancel}
            data-testid='object-form-preview-cancel'
          >
            {locales.cancel}
          </Button>
          <Button
            variant='contained'
            size='small'
            disabled={isExecuting || queries.length === 0}
            onClick={onConfirm}
            data-testid='object-form-execute'
            startIcon={isExecuting ? <CircularProgress size={14} color='inherit' /> : undefined}
          >
            {locales.object_form_execute_queries}
          </Button>
        </QueryPreviewActionsStyled>
      </QueryPreviewContentStyled>
    </Modal>
  );
}
