import type { Components, Theme } from '@mui/material';
import type {} from '@mui/x-tree-view/themeAugmentation';
import { variables } from '../variables';

type MuiTree = object;

export default function TreeView(theme: Theme): Components | MuiTree {
  return {
    MuiTreeItem: {
      styleOverrides: {
        root: {
          borderRadius: variables.radius.medium,
          backgroundColor: theme.palette.background,
          color: theme.palette.text.text,
          '& .MuiTreeItem-content': {
            borderRadius: variables.radius.small,
            height: 32,
            '&:hover': {
              background: `${theme.palette.background.default} !important`,
              color: theme.palette.text.primary
            }
          },
          '& .Mui-selected': {
            background: `${theme.palette.background.default} !important`,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`
          }
        }
      }
    }
  };
}
