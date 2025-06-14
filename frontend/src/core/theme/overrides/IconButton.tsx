import { variables } from '@/core/theme/variables.ts';
import type { Components, Theme } from '@mui/material/styles';

export default function IconButton(theme: Theme): Components {
  return {
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: variables.radius.medium,
          padding: '2px 8px',
          '&.Mui-disabled': {
            color: `${theme.palette.text.disabled} !important`,
            '& svg': { color: `${theme.palette.text.disabled} !important` }
          },
          '&.active': {
            backgroundColor: theme.palette.background.paper,
            '& svg': { color: `${theme.palette.text.primary} !important` }
          }
        }
      }
    }
  };
}
