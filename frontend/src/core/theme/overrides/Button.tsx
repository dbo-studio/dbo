import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Button(theme: Theme): Components {
  return {
    MuiButton: {
      styleOverrides: {
        root: {
          height: 32,
          borderRadius: variables.radius.medium,
          padding: '0 8px',
          '&.Mui-disabled': {
            background: theme.palette.action.disabledBackground,
            color: theme.palette.action.disabled,
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
            padding: '5px 16px',
            fontSize: theme.typography.caption.fontSize
          }
        }
      }
    }
  };
}
