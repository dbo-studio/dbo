import { variables } from '@/core/theme/variables';
import { Stack, styled } from '@mui/material';

export const ChatHistoryStyled = styled(Stack)(({ theme }) => ({
  width: '280px',
  maxHeight: '340px',
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  boxShadow: 'none',
  zIndex: 1000,
  overflow: 'auto'
}));

// Phone sheet: rows share one bordered card with dividers, like the action sheet and the other lists.
export const ChatHistoryGroupStyled = styled(Stack)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

export const ChatHistoryListStyled = styled(Stack)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  padding: theme.spacing(1),
  overflow: 'auto'
}));

export const ChatHistoryItemStyled = styled(Stack)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  borderRadius: variables.radius.medium,
  padding: '2px 4px',
  border: '1px solid transparent',
  ':hover': {
    border: `1px solid ${theme.palette.divider}`
  },
  '&.is-selected': {
    backgroundColor: theme.palette.action.selected
  },
  [theme.breakpoints.down('sm')]: {
    marginBottom: 0,
    minHeight: 52,
    padding: theme.spacing(0.5, 0.5, 0.5, 1.5),
    borderRadius: 0,
    border: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
    ':hover': { border: 'none', borderBottom: `1px solid ${theme.palette.divider}` },
    ':last-child': { borderBottom: 'none' },
    // 44px hit area around each tiny action icon.
    '& .history-actions > span': { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 44 }
  },
  '.history-actions': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexShrink: 0
  }
}));
