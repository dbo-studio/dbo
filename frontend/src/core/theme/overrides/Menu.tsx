import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Menu(theme: Theme): Components {
  return {
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: theme.palette.background.default,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)',
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
