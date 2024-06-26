import { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Input(theme: Theme): Components {
  return {
    MuiInputBase: {
      styleOverrides: {
        root: {
          background: theme.palette.background.default,
          height: 32,
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          borderRadius: variables.radius.medium,
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
          input: {
            '&::placeholder': {
              color: theme.palette.text.primary
            }
          },

          '&.MuiInputBase-sizeSmall': {
            height: 24,
            fontSize: theme.typography.caption.fontSize,
            select: {
              padding: 0
            },
            input: {
              padding: 0
            }
          },
          select: {
            ':focus': {
              background: 'transparent'
            }
          }
        }
      }
    }
  };
}
