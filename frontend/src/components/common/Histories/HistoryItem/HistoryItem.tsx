import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { alpha, Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { type JSX, type MouseEvent, useCallback } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import type { HistoryItemProps } from '../types';
import { statementKind, statementVerb, timeLabel, type StatementKind } from '../historyUtils';
import { HistoryItemStyled } from './HistoryItem.styled';

function useKindColor(kind: StatementKind): string {
  const { palette } = useTheme();
  switch (kind) {
    case 'read':
      return palette.info.main;
    case 'write':
      return palette.warning.main;
    case 'danger':
      return palette.error.main;
    case 'ddl':
      return palette.secondary.main;
    default:
      return palette.text.secondary;
  }
}

export default function HistoryItem({ history, selected, onClick, context }: HistoryItemProps): JSX.Element {
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const [, copy] = useCopyToClipboard();
  const verb = statementVerb(history.query);
  const color = useKindColor(statementKind(verb));

  const open = useCallback((e?: MouseEvent): void => {
    e?.stopPropagation();
    addEditorTab(history.query);
  }, [addEditorTab, history.query]);

  const handleCopy = (e: MouseEvent): void => {
    e.stopPropagation();
    copy(history.query).catch(() => undefined);
    toast.success(locales.copied);
  };

  return (
    <HistoryItemStyled
      selected={selected}
      data-testid='history-item'
      onClick={onClick}
      onDoubleClick={() => open()}
      onContextMenu={(e) => {
        onClick();
        context(e);
      }}
    >
      <Typography variant='caption' color='textSubdued' sx={{ width: 76, flexShrink: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {timeLabel(history.createdAt)}
      </Typography>
      <Box
        sx={{
          width: 64,
          flexShrink: 0,
          textAlign: 'center',
          borderRadius: 0.75,
          py: '1px',
          typography: 'caption',
          fontWeight: 600,
          lineHeight: 1.4,
          color,
          bgcolor: alpha(color, 0.12)
        }}
      >
        {verb || '—'}
      </Box>
      <Tooltip title={<code style={{ whiteSpace: 'pre-wrap' }}>{history.query.slice(0, 1200)}</code>} enterDelay={600} placement='top-start'>
        <Typography
          noWrap
          variant='body2'
          sx={{ flex: 1, minWidth: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        >
          {history.query.replace(/\s+/g, ' ').trim()}
        </Typography>
      </Tooltip>
      <Box className='history-actions' sx={{ display: 'flex', flexShrink: 0 }}>
        <Tooltip title={locales.run}>
          <IconButton size='small' aria-label={locales.run} onClick={open}>
            <CustomIcon type='play' size='s' />
          </IconButton>
        </Tooltip>
        <Tooltip title={locales.copy}>
          <IconButton size='small' aria-label={locales.copy} onClick={handleCopy}>
            <CustomIcon type='copy' size='s' />
          </IconButton>
        </Tooltip>
      </Box>
    </HistoryItemStyled>
  );
}
