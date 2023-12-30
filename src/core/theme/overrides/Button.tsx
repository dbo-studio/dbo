import { Components, Theme } from '@mui/material/styles';

export default function Button(theme: Theme): Components {
  return {
    MuiButton: {
      styleOverrides: {
        root: {
          height: 32,
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          borderRadius: 5,
          padding: '0 8px',
          '&.Mui-disabled': {
            '& svg': { color: theme.palette.text.disabled }
          },
          '&.Mui-focused': {
            borderColor: theme.palette.action.active
          },
          ':before': {
            borderBottom: 'none !important'
          },
          ':after': {
            borderBottom: 'none !important'
          },

          '&.MuiButton-sizeSmall': {
            height: 24,
            fontSize: theme.typography.caption.fontSize
          }
        }
      }
    }
  };
}
