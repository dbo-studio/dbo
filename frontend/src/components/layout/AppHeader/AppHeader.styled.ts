import { variables } from '@/core/theme/variables';
import { Grid, styled } from '@mui/material';

export const AppHeaderStyled = styled(Grid)(({ theme }) => ({
  boxSizing: 'border-box',
  height: 40,
  flexShrink: 0,
  flexWrap: 'nowrap',
  // 10px = half the 48px activity bar minus half the 28px button, so the sidebar icon centers over the rail
  padding: theme.spacing(0, 1.25),
  background: theme.palette.background.subdued,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: 'relative',
  zIndex: 101,
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'default',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  // Flat, compact toolbar buttons (same density as the status bar)
  '& .MuiIconButton-root': {
    height: 28,
    minWidth: 28,
    padding: theme.spacing(0, 0.75),
    borderRadius: variables.radius.small,
    '&:hover': { background: theme.palette.action.hover }
  },
  '& .MuiTouchRipple-root': { display: 'none' },
  // CustomIcon passes mixed sizes (16/20); force one size so the row aligns
  '& svg, & img': { width: 16, height: 16 }
}));

export const AppHeaderGridStyled = styled(Grid, {
  shouldForwardProp: (prop) => prop !== 'useCompactHeader'
})<{ useCompactHeader: boolean }>(({ useCompactHeader }) => ({
  display: useCompactHeader ? 'flex' : 'none',
  justifyContent: 'flex-start',
  alignItems: 'center',
  flexShrink: 0
}));
