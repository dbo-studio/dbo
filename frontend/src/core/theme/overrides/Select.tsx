import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Select(theme: Theme): Components {
  return {
    MuiSelect: {
      styleOverrides: {
        root: {
          background: theme.palette.background.default,
          height: variables.control
        },
        select: {
          padding: 0
        }
      }
    }
  };
}
