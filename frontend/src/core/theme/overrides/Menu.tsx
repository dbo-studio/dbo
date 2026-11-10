import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Menu(theme: Theme): Components {
  return {
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: theme.palette.background.default,
          boxShadow: variables.shadow.popover,
          border: `1px solid ${theme.palette.divider}`,
          minWidth: 180,
          padding: '0 2px',
          borderRadius: variables.radius.large
        },
        list: {
          paddingTop: 2,
          paddingBottom: 2,
          background: theme.palette.background.default
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: theme.palette.text.text,
          borderRadius: variables.radius.small,
          fontSize: theme.typography.body2.fontSize,
          '&:hover': {
            backgroundColor: theme.palette.background.paper
          },
          '&:focus-visible': {
            // backgroundColor: 'transparent'
            backgroundColor: theme.palette.background.paper
          }
        }
      }
    }
  };
}
