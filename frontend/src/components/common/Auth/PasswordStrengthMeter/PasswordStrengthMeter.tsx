import { evaluatePasswordStrength } from '@/core/auth/passwordStrength';
import locales from '@/locales';
import { Box, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { JSX } from 'react';

export type PasswordStrengthMeterProps = {
  password: string;
};

const strengthLabels: Record<string, string> = {
  auth_pw_strength_weak: locales.auth_pw_strength_weak,
  auth_pw_strength_fair: locales.auth_pw_strength_fair,
  auth_pw_strength_good: locales.auth_pw_strength_good,
  auth_pw_strength_strong: locales.auth_pw_strength_strong
};

const checkLabels: Record<string, string> = {
  auth_pw_check_length: locales.auth_pw_check_length,
  auth_pw_check_letter: locales.auth_pw_check_letter,
  auth_pw_check_digit: locales.auth_pw_check_digit,
  auth_pw_check_mixed: locales.auth_pw_check_mixed,
  auth_pw_check_symbol: locales.auth_pw_check_symbol
};

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps): JSX.Element {
  const theme = useTheme();
  const strength = evaluatePasswordStrength(password);
  const missing = strength.checks.filter((c) => !c.ok);

  const barColor =
    strength.score <= 1
      ? theme.palette.error.main
      : strength.score === 2
        ? theme.palette.warning.main
        : strength.score === 3
          ? theme.palette.info.main
          : theme.palette.success.main;

  return (
    <Box sx={{ mt: 0.5, width: '100%' }} data-testid='password-strength-meter'>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          mb: 0.5
        }}
      >
        <Typography variant='caption' color='text.secondary'>
          {locales.auth_password_strength}
        </Typography>
        <Typography variant='caption' sx={{ fontWeight: 600, color: barColor }} data-testid='password-strength-label'>
          {strengthLabels[strength.labelKey] ?? locales.auth_pw_strength_weak}
        </Typography>
      </Box>
      <LinearProgress
        variant='determinate'
        value={strength.percent}
        sx={{
          height: 6,
          borderRadius: 999,
          backgroundColor: alpha(barColor, 0.15),
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            backgroundColor: barColor
          }
        }}
      />
      {missing.length > 0 ? (
        <Stack component='ul' spacing={0.25} sx={{ m: 0, mt: 1, pl: 2 }}>
          {missing.map((check) => (
            <Typography
              key={check.id}
              component='li'
              variant='caption'
              color='text.secondary'
              data-testid={`password-hint-${check.id}`}
            >
              {checkLabels[check.labelKey] ?? check.labelKey}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
