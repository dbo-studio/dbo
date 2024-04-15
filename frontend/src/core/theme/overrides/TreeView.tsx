import { Components, Theme } from '@mui/material';
import { variables } from '../variables';

type MuiTree = object;

export default function TreeView(theme: Theme): Components | MuiTree {
  return {
    MuiTreeItem: {
      styleOverrides: {
        root: {
          borderRadius: variables.radius.medium,
          backgroundColor: theme.palette.background,
          color: theme.palette.text.primary,
          '& .MuiTreeItem-content': {
            borderRadius: variables.radius.small,
            height: 32
          }
        }
      }
    }
  };
}
