import { ButtonBase, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const TabBarStyled = styled('nav')(({ theme }) => ({
  display: 'flex',
  flexShrink: 0,
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.subdued,
  paddingBottom: 'env(safe-area-inset-bottom)'
}));

// Same selected treatment as the desktop SidebarSectionTabs: primary rule, uppercase caption label.
export const TabBarButtonStyled = styled(ButtonBase)(({ theme }) => ({
  flex: 1,
  minHeight: 54,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  borderTop: '2px solid transparent',
  marginTop: -1,
  fontSize: variables.fontSize.xxs,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: theme.palette.text.subdued,
  '&[aria-current="page"]': {
    borderTopColor: theme.palette.primary.main,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.text,
    fontWeight: theme.typography.fontWeightMedium,
    svg: {
      color: theme.palette.text.link
    }
  }
}));
