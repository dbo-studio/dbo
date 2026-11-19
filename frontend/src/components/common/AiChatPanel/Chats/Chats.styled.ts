import { Box, styled } from '@mui/material';

export const ChatsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  overflowX: 'auto',
  overflowY: 'hidden',
  flex: 1,
  minWidth: 0,
  scrollbarWidth: 'none',
  gap: theme.spacing(0.25),
  maskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent)',
  WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent)',
  '&::-webkit-scrollbar': { display: 'none' }
}));
