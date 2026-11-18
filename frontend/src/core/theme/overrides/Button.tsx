import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Button(theme: Theme): Components {
  return {
    MuiButton: {
      defaultProps: { disableElevation: true, loadingPosition: 'start' },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          height: variables.control,
          fontSize: theme.typography.caption.fontSize,
          lineHeight: theme.typography.caption.lineHeight,
          borderRadius: variables.radius.medium,
          padding: '0 8px',
          '&.MuiButton-textPrimary, &.MuiButton-outlinedPrimary': {
            color: theme.palette.text.link
          },
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
          '&.MuiButton-loading.MuiButton-loadingPositionStart .MuiButton-startIcon': {
            visibility: 'hidden'
          },
          '&.MuiButton-loading.MuiButton-loadingPositionEnd .MuiButton-endIcon': {
            visibility: 'hidden'
          }
        },
        // MUI centers the spinner, and on a full-width button it drops back into the flex row,
        // so a long label puts the spinner in the middle. Keep it at the start, beside the text.
        loadingIndicator: {
          position: 'absolute',
          left: 6,
          right: 'auto',
          transform: 'none'
        }
      }
    }
  };
}
