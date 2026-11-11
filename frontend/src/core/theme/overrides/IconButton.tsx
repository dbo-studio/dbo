import { variables } from '@/core/theme/variables.ts';
import type { Components, Theme } from '@mui/material/styles';

export default function IconButton(theme: Theme): Components {
  return {
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: variables.radius.medium,
          height: variables.control,
          minWidth: variables.control,
          padding: '0 6px',
          '&.Mui-disabled': {
            color: `${theme.palette.text.disabled} !important`,
            '& svg': { color: `${theme.palette.text.disabled} !important` }
          },
          '&.active': {
            backgroundColor: theme.palette.background.paper,
            '& svg': { color: `${theme.palette.primary.main} !important` }
          },
          '&.MuiIconButton-loading > *:not(.MuiIconButton-loadingWrapper)': {
            visibility: 'hidden'
          }
        }
      }
    }
  };
}
