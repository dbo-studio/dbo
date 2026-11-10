import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Input(theme: Theme): Components {
  return {
    MuiInputBase: {
      styleOverrides: {
        root: {
          background: theme.palette.background.default,
          height: variables.control.md,
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.text,
          borderRadius: variables.radius.medium,
          padding: '0 8px',
          '&.Mui-disabled': {
            '& svg': { color: theme.palette.text.disabled }
          },
          '&.Mui-error': {
            border: `1px solid ${theme.palette.error.main} !important`
          },
          '&.Mui-focused': {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 1px ${theme.palette.primary.main}`
          },
          ':before': {
            borderBottom: 'none !important'
          },
          ':after': {
            borderBottom: 'none !important'
          },
          input: {
            '&::placeholder': {
              color: theme.palette.text.placeholder,
              opacity: 1
            }
          },

          '&.MuiInputBase-sizeSmall': {
            height: variables.control.sm,
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
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          color: theme.palette.text.text,
          '& .MuiTypography-root': {
            fontSize: '13px'
          }
        }
      }
    }
  };
}
