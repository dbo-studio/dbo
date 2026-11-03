import { alpha, type Components, type Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Menu(theme: Theme): Components {
  return {
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: theme.palette.background.default,
          boxShadow: `0 4px 6px -1px ${alpha(theme.palette.common.black, 0.1)},0 2px 4px -2px ${alpha(theme.palette.common.black, 0.1)}`,
          border: `1px solid ${theme.palette.divider}`,
          minWidth: 180,
          padding: '0 2px',
          borderRadius: variables.radius.medium
        },
        list: {
          paddingTop: 2,
          paddingBottom: 2,
          background: theme.palette.background.default
        }
      }
    },
    // Popovers (connection switcher, activity) match menus: hairline border, soft shadow.
    MuiPopover: {
      styleOverrides: {
        paper: {
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: `0 4px 6px -1px ${alpha(theme.palette.common.black, 0.1)},0 2px 4px -2px ${alpha(theme.palette.common.black, 0.1)}`,
          borderRadius: variables.radius.medium
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: theme.palette.text.text,
          borderRadius: variables.radius.small,
          fontSize: theme.typography.body2.fontSize,
          '&:hover, &:focus-visible': {
            backgroundColor: theme.palette.action.hover
          },
          // Selected must differ from hover, and stay visible while hovered.
          '&.Mui-selected': {
            backgroundColor: theme.palette.action.selected,
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2)
            }
          }
        }
      }
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          background: 'transparent',
          color: theme.palette.text.subdued,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }
      }
    }
  };
}
