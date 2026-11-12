import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

// Mirrors components/base/Modal so a bare MUI Dialog looks like our Modal.
export default function Dialog(theme: Theme): Components {
  return {
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          boxShadow: 'none',
          background: theme.palette.background.default,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: variables.radius.large,
          padding: theme.spacing(2)
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          ...theme.typography.h6,
          color: theme.palette.text.title,
          padding: 0,
          paddingBottom: theme.spacing(1),
          marginBottom: theme.spacing(1),
          borderBottom: `1px solid ${theme.palette.divider}`
        }
      }
    },
    MuiDialogContent: { styleOverrides: { root: { padding: 0 } } },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: 0,
          marginTop: theme.spacing(2),
          gap: theme.spacing(1),
          '& > :not(style) ~ :not(style)': { marginLeft: 0 }
        }
      }
    }
  };
}
