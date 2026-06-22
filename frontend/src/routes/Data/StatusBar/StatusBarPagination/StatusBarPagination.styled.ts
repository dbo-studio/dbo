import { Box, styled, Typography } from '@mui/material';

type StatusBarPaginationStyledProps = {
  visible: boolean;
};

export const StatusBarPaginationStyled = styled(Box)<StatusBarPaginationStyledProps>(({ visible }) => ({
  alignItems: 'center',
  justifyContent: 'flex-end',
  display: visible ? 'flex' : 'none',
  flexDirection: 'row',
  width: 208
}));

export const PageNumberStyled = styled(Typography)(() => ({
  fontWeight: 'bold',
  textAlign: 'center',
  minWidth: 54
}));
