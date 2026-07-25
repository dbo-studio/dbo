import { Box, styled } from '@mui/material';

export const ChatsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  overflowY: 'hidden',
  flex: 1,
  minWidth: 0,
  scrollbarWidth: 'thin',
  gap: theme.spacing(0.25),
  maskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent)',
  WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent)'
}));
