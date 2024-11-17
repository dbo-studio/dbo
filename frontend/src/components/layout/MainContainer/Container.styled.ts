import { Box, styled } from '@mui/material';

export const CenterContainerStyled = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}));

export const EndContainerStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  border: `1px 1px 0 1px solid ${theme.palette.divider}`,
  overflow: 'auto',
  background: theme.palette.background.subdued
}));

export const StartContainerStyled = styled(Box)(({ theme }) => ({
  borderLeft: `1px solid ${theme.palette.divider}`,
  overflow: 'auto'
}));

export const ExplorerContainerStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  overflow: 'auto',
  background: theme.palette.background.subdued
}));
