import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

// Merged over each field's own inputProps by InputBase, so callers keep their test ids and aria labels.
const NO_AUTO_CORRECT = { autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false } as const;

export default function Input(theme: Theme): Components {
  return {
    MuiInputBase: {
      defaultProps: {
        autoComplete: 'off',
        slotProps: { input: NO_AUTO_CORRECT }
      },
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
          },
          // The fixed height suits one line; a multiline field grows with its text instead of spilling out.
          '&.MuiInputBase-multiline, &.MuiInputBase-multiline.MuiInputBase-sizeSmall': {
            height: 'auto',
            padding: '6px 8px'
          }
        }
      }
    },
    // TextField/Select render OutlinedInput: drop its notched fieldset and padding so it matches FieldInput.
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          // OutlinedInput's own radius and padding come later in the cascade than the InputBase ones; restate them.
          borderRadius: variables.radius.medium,
          padding: '0 8px',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          '&.MuiInputBase-sizeSmall': { padding: '0 8px', fontSize: theme.typography.caption.fontSize },
          '&.Mui-error': { border: `1px solid ${theme.palette.error.main}` },
          '& .MuiOutlinedInput-notchedOutline': { display: 'none' },
          '& .MuiOutlinedInput-input': { padding: 0, height: '100%' },
          '&.MuiInputBase-multiline .MuiOutlinedInput-input': { height: 'auto' }
        }
      }
    },
    // TextField labels sit above the input like FieldInput's label row, not floating inside the border.
    MuiTextField: { defaultProps: { slotProps: { inputLabel: { shrink: true } } } },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.MuiInputLabel-formControl': {
            position: 'static',
            transform: 'none',
            maxWidth: '100%',
            marginBottom: 4,
            fontSize: theme.typography.caption.fontSize,
            lineHeight: theme.typography.caption.lineHeight,
            color: theme.palette.text.text,
            '&.Mui-focused': { color: theme.palette.text.text },
            '&.Mui-error': { color: theme.palette.text.text }
          }
        }
      }
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 0, marginRight: 0, fontSize: theme.typography.caption.fontSize } }
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
