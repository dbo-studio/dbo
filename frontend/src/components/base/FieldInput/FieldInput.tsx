import type { EventFor } from '@/types';
import locales from '@/locales';
import { Box, IconButton, InputAdornment, Typography, useTheme } from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';
import type React from 'react';
import { type JSX, useState } from 'react';
import { FieldInputInputStyled, FieldInputLabelRowStyled } from './FieldInput.styled';
import type { FieldInputProps } from './types';

/** Keeps Bitwarden, 1Password and LastPass from offering to fill app fields. */
export const PASSWORD_MANAGER_OFF = {
  'data-bwignore': 'true',
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-form-type': 'other'
};

export default function FieldInput({
  ref,
  label,
  helpertext,
  helpertone = 'error',
  typelabel,
  value: valueProp,
  type,
  onChange,
  onBlur,
  error,
  margin,
  sx,
  mb,
  ...props
}: FieldInputProps & { ref?: React.Ref<HTMLInputElement> }): JSX.Element {
  const theme = useTheme();
  const [value, setValue] = useState(() => valueProp as string);
  const [revealed, setRevealed] = useState(false);
  // Every password field gets an eye; callers that bring their own end adornment keep it.
  const hasToggle = type === 'password' && !props.endAdornment;
  const [prevSync, setPrevSync] = useState({ type, value: valueProp });

  if (prevSync.type !== type || prevSync.value !== valueProp) {
    setPrevSync({ type, value: valueProp });
    setValue(valueProp as string);
  }

  const handleOnChange = (e: EventFor<'input', 'onChange'>): void => {
    setValue(e.target.value);
    onChange?.(e);
  };

  const handleOnBlur = (e: EventFor<'input', 'onBlur'>): void => {
    // MUI calls onBlur() with no event when a focused input becomes disabled.
    if (e) setValue(e.target.value);
    onBlur?.(e);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <FieldInputLabelRowStyled>
        <Typography color={'textText'} variant='caption'>
          {label}
        </Typography>
        <Typography color={'textText'} variant='caption'>
          {typelabel}
        </Typography>
      </FieldInputLabelRowStyled>
      <FieldInputInputStyled
        ref={ref}
        value={value}
        autoComplete='off'
        autoCapitalize='off'
        autoCorrect='off'
        spellCheck='false'
        onBlur={handleOnBlur}
        onChange={handleOnChange}
        error={error}
        margin={margin}
        sx={sx}
        type={hasToggle && revealed ? 'text' : type}
        {...props}
        endAdornment={
          hasToggle ? (
            <InputAdornment position='end'>
              <IconButton
                edge='end'
                tabIndex={-1}
                aria-label={revealed ? locales.ai_key_hide : locales.ai_key_show}
                aria-pressed={revealed}
                disabled={props.disabled}
                onMouseDown={(e): void => e.preventDefault()}
                onClick={(): void => setRevealed((r) => !r)}
              >
                {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              </IconButton>
            </InputAdornment>
          ) : (
            props.endAdornment
          )
        }
        inputProps={{ ...PASSWORD_MANAGER_OFF, ...props.inputProps }}
      />
      {helpertext && (
        <Typography
          color={helpertone === 'success' ? 'success.main' : helpertone === 'muted' ? 'textSecondary' : 'error'}
          variant='caption'
          sx={{
            mb: theme.spacing(mb ?? 0)
          }}
        >
          {helpertext}
        </Typography>
      )}
    </Box>
  );
}
