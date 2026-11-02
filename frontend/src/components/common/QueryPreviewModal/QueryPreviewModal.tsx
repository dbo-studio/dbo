import Modal from '@/components/base/Modal/Modal';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { Box, Button, CircularProgress, TextField } from '@mui/material';
import React, { useState } from 'react';
import { QueryPreviewContentStyled } from './QueryPreviewModal.styled';

export type QueryPreviewModalProps = {
  open: boolean;
  queries: string[];
  isExecuting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Prefix for data-testid values, e.g. `object-form` → `object-form-preview-modal`. */
  testIdPrefix?: string;
  /** Text the user must type before Execute enables, such as the name of a table being dropped. */
  confirmText?: string;
};

export default function QueryPreviewModal({
  open,
  queries,
  isExecuting,
  onCancel,
  onConfirm,
  testIdPrefix = 'object-form',
  confirmText
}: QueryPreviewModalProps): React.JSX.Element {
  const [typed, setTyped] = useState('');
  // Each opening asks again.
  if (!open && typed) setTyped('');
  const confirmed = !confirmText || typed.trim() === confirmText;

  const formattedQueries = queries
    .filter((query) => query.trim() !== '')
    .map((query, index) => `-- ${index + 1}\n${query}`)
    .join('\n\n');

  return (
    <Modal
      open={open}
      title={locales.query_preview}
      onClose={onCancel}
      footer={
        <>
          <Button
            size='small'
            variant='text'
            disabled={isExecuting}
            onClick={onCancel}
            data-testid={`${testIdPrefix}-preview-cancel`}
          >
            {locales.cancel}
          </Button>
          <Button
            size='small'
            variant='contained'
            disabled={isExecuting || queries.length === 0 || !confirmed}
            onClick={onConfirm}
            data-testid={`${testIdPrefix}-execute`}
            startIcon={isExecuting ? <CircularProgress size={14} color='inherit' /> : undefined}
          >
            {locales.object_form_execute_queries}
          </Button>
        </>
      }
    >
      <QueryPreviewContentStyled data-testid={`${testIdPrefix}-preview-modal`}>
        <Box sx={{ flex: 1 }}>
          <SyntaxHighlighter value={formattedQueries} />
        </Box>
        {confirmText && (
          <TextField
            size='small'
            autoComplete='off'
            label={locales.query_preview_type_to_confirm.replace('{name}', confirmText)}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            slotProps={{ htmlInput: { 'data-testid': `${testIdPrefix}-confirm-input` } }}
          />
        )}
      </QueryPreviewContentStyled>
    </Modal>
  );
}
