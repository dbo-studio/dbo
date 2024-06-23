import { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Menu(theme: Theme): Components {
  return {
    MuiMenu: {
      styleOverrides: {
        root: {
          color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300]
        },
        paper: {
          background: theme.palette.background.default,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)',
          border: `1px solid ${theme.palette.divider}`,
          minWidth: 180,
          borderRadius: variables.radius.medium
        },
        list: {
          paddingTop: theme.spacing(1),
          paddingBottom: theme.spacing(1),
          background: theme.palette.background.default
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: theme.typography.body2.fontSize,
          '&:hover': {
            backgroundColor: theme.palette.background.paper
          }
        }
      }
    }
  };
}
