import type { Components, Theme } from '@mui/material/styles';

export default function IconButton(theme: Theme): Components {
  return {
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            color: `${theme.palette.text.disabled} !important`,
            '& svg': { color: `${theme.palette.text.disabled} !important` }
          }
        }
      }
    }
  };
}
