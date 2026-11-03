import { alpha, Box, styled } from '@mui/material';

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
  width: '83px',
  minWidth: '83px',
  maxWidth: '83px',
  overflowX: 'hidden',
  overflowY: 'auto',
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

/** Title row of a sidebar area that has no tabs (Boards, Backup): the same 35px strip the tabs use. */
export const SidebarAreaTitleStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  height: 35,
  padding: theme.spacing(0, 1.5),
  flexShrink: 0,
  background: theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const LockedBannerStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  minHeight: 32,
  padding: theme.spacing(0, 1.5),
  flexShrink: 0,
  background: alpha(theme.palette.warning.main, 0.12),
  borderBottom: `1px solid ${theme.palette.divider}`,
  svg: { color: theme.palette.warning.main }
}));
