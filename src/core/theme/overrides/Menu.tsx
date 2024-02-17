import { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Menu(theme: Theme): Components {
  return {
    MuiMenu: {
      styleOverrides: {
        root: {
          borderRadius: variables.radius.medium,
          marginTop: theme.spacing(1),
          minWidth: 180,
          color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
          boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
          padding: '8px'
        },
        paper: {
          background: theme.palette.background.default
        },
        list: {
          background: theme.palette.background.default
        }
      }
    }
  };
}
