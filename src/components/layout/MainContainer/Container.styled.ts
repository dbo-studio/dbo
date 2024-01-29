import { tools } from '@/src/core/utils';
import { Box, styled } from '@mui/material';

export const CenterContainerStyled = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  maxHeight: tools.screenMaxHeight(),
  minHeight: tools.screenMaxHeight(),
  height: tools.screenMaxHeight(),
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}));

export const EndContainerStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  height: tools.screenMaxHeight(),
  overflow: 'auto'
}));

export const StartContainerStyled = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  borderLeft: `1px solid ${theme.palette.divider}`,
  height: tools.screenMaxHeight(),
  overflow: 'auto'
}));

export const ExplorerContainerStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: tools.screenMaxHeight(),
  overflow: 'auto'
}));
