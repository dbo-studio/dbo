import { Box, styled } from '@mui/material';

const containerBaseStyles = {
  height: '100%',
  minHeight: 0
};

export const CenterContainerStyled = styled(Box)(({ theme }) => ({
  ...containerBaseStyles,
  borderBottom: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0
}));

type EndContainerStyledProps = {
  fullPage?: boolean;
};

export const EndContainerStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'fullPage'
})<EndContainerStyledProps>(({ theme, fullPage }) => ({
  ...containerBaseStyles,
  borderRight: fullPage ? 'none' : `1px solid ${theme.palette.divider}`,
  borderLeft: fullPage ? 'none' : `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  background: theme.palette.background.subdued,
  display: 'flex',
  flexDirection: 'column',
  ...(fullPage && {
    flex: 1,
    width: '100%',
    minWidth: 0
  })
}));

export const StartContainerStyled = styled(Box)(({ theme }) => ({
  ...containerBaseStyles,
  borderLeft: `1px solid ${theme.palette.divider}`,
  overflow: 'auto',
  flexShrink: 0
}));

type ExplorerContainerStyledProps = {
  fullPage?: boolean;
};

export const ExplorerContainerStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'fullPage'
})<ExplorerContainerStyledProps>(({ theme, fullPage }) => ({
  ...containerBaseStyles,
  borderBottom: fullPage ? 'none' : `1px solid ${theme.palette.divider}`,
  borderRight: fullPage ? 'none' : `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.background.subdued,
  ...(fullPage && {
    flex: 1,
    width: '100%',
    minWidth: 0
  })
}));
