import api from '@/api';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { AiAuditEntryType } from '@/types/AiAudit';
import { Box, Chip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { McpSectionStyled } from '../AiPanel.styled';

const STATUS: Record<AiAuditEntryType['status'], { label: string; color: 'success' | 'warning' | 'error' }> = {
  applied: { label: locales.ai_audit_applied, color: 'success' },
  partial: { label: locales.ai_audit_partial, color: 'warning' },
  failed: { label: locales.ai_audit_failed, color: 'error' }
};

export default function AiAuditPanel(): JSX.Element {
  const currentId = useConnectionStore((state) => state.currentConnectionId);
  const connectionId = currentId === undefined ? undefined : Number(currentId);
  const { data: entries } = useQuery({
    queryKey: ['ai-audit', connectionId],
    queryFn: () => api.aiAudit.getAuditEntries(connectionId as number),
    enabled: connectionId !== undefined
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }} data-testid='ai-audit'>
      <Typography color='text.secondary' variant='caption'>
        {connectionId === undefined ? locales.ai_audit_no_connection : locales.ai_audit_description}
      </Typography>
      {connectionId !== undefined && entries?.length === 0 ? (
        <Typography variant='body2'>{locales.ai_audit_empty}</Typography>
      ) : null}
      {entries?.map((entry) => (
        <McpSectionStyled key={entry.id} data-testid='ai-audit-entry'>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Chip size='small' color={STATUS[entry.status].color} label={STATUS[entry.status].label} />
            <Typography color='text.secondary' variant='caption'>
              {new Date(entry.createdAt).toLocaleString()}
            </Typography>
          </Box>
          <Typography variant='body2'>{entry.summary}</Typography>
          {entry.sql ? <SyntaxHighlighter value={entry.sql} lang='sql' /> : null}
          {entry.error ? (
            <Typography color='error' variant='caption'>
              {entry.error}
            </Typography>
          ) : null}
        </McpSectionStyled>
      ))}
    </Box>
  );
}
