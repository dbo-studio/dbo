import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import api from '@/api';
import { claimReview, recordReview, releaseReview } from '@/core/ai/recordReview';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { AiPermissionRequest } from '@/types';
import { Button, Chip, CircularProgress, Stack, Typography, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import ChatDataTable from '../ChatDataTable/ChatDataTable';
import { AgentCardBodyStyled, AgentCardStyled, CardActionsStyled } from '../AgentCards.styled';

/**
 * Confirm-before-write card for an agent execute_write request. The statement
 * only runs through /query/raw (Safe Mode + history) after an explicit Confirm.
 */
export default function PermissionCard({ request }: { request: AiPermissionRequest }): JSX.Element {
  const theme = useTheme();
  const decision = useAiStore((state) => state.reviews[request.requestId]) ?? request.decision;
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[]>();
  const [columns, setColumns] = useState<string[]>();

  const confirm = async (): Promise<void> => {
    setRunning(true);
    let claimed = false;
    let ran = false;
    try {
      if (!(await claimReview(request.requestId))) {
        toast.error(locales.ai_permission_already_reviewed);
        return;
      }

      claimed = true;
      const result = await withSafeModeRetry((confirmed) =>
        api.query.runRawQuery({
          connectionId: request.connectionId,
          query: request.sql,
          database: request.database || undefined,
          schema: request.schema || undefined,
          confirmed
        })
      );
      if (!result) return;

      ran = true;
      useAiStore.getState().setReview(request.requestId, 'confirmed');
      setRows(result.data);
      setColumns(result.columns.map((column) => column.name));
      if (request.class === 'ddl') {
        await useTreeStore.getState().reloadTree(false);
      }
    } finally {
      if (claimed && !ran) releaseReview(request.requestId);
      setRunning(false);
    }
  };

  const pending = decision === undefined;

  return (
    <AgentCardStyled
      accent={pending ? theme.palette.warning.main : undefined}
      data-testid='ai-permission-card'
      data-decision={decision ?? 'pending'}
    >
      <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', px: 1, py: 0.75 }}>
        <CustomIcon type='lock' size='xs' />
        <Typography variant='caption' sx={{ fontWeight: 600, flex: 1 }}>
          {locales.ai_permission_title}
        </Typography>
        <Chip size='small' variant='outlined' label={request.class} sx={{ height: 18, fontSize: '0.6875rem' }} />
      </Stack>
      <AgentCardBodyStyled>
        <SyntaxHighlighter value={request.sql} />
        {decision === 'confirmed' &&
          (rows && rows.length > 0 ? (
            <ChatDataTable rows={rows} columns={columns} />
          ) : (
            <Typography variant='caption' color='success.main'>
              {locales.ai_permission_executed}
            </Typography>
          ))}
        {decision === 'rejected' && (
          <Typography variant='caption' color='textSubdued'>
            {locales.ai_permission_rejected}
          </Typography>
        )}
        {pending && (
          <CardActionsStyled>
            <Button
              size='small'
              variant='text'
              color='inherit'
              onClick={() => recordReview(request.requestId, 'rejected')}
              data-testid='ai-permission-reject'
            >
              {locales.ai_reject}
            </Button>
            <Button
              size='small'
              variant='text'
              onClick={() => useTabStore.getState().addEditorTab(request.sql)}
              data-testid='ai-permission-edit'
            >
              {locales.ai_edit_in_editor}
            </Button>
            <Button
              size='small'
              variant='contained'
              color='warning'
              disabled={running}
              onClick={() => void confirm()}
              data-testid='ai-permission-confirm'
              startIcon={running ? <CircularProgress size={14} color='inherit' /> : undefined}
            >
              {locales.ai_permission_confirm}
            </Button>
          </CardActionsStyled>
        )}
      </AgentCardBodyStyled>
    </AgentCardStyled>
  );
}
