import { ThemeModeEnum } from '@/core/enums';
import { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Input(theme: Theme): Components {
  return {
    MuiInputBase: {
      styleOverrides: {
        root: {
          background: theme.palette.background.neutral,
          height: 32,
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.text,
          borderRadius: variables.radius.medium,
          padding: '0 8px',
          '&.Mui-disabled': {
            '& svg': { color: theme.palette.text.disabled }
          },
          '&.Mui-focused': {
            borderBottom: `1px solid ${theme.palette.mode == ThemeModeEnum.Dark ? theme.palette.primary.dark : theme.palette.primary.light}`
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
