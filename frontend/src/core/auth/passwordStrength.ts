export const AUTH_PASSWORD_MIN = 8;
export const AUTH_PASSWORD_MAX = 40;

export type PasswordCheck = {
  id: 'length' | 'letter' | 'digit' | 'mixed' | 'symbol';
  labelKey: string;
  ok: boolean;
};

export type PasswordStrength = {
  score: number; // 0–4
  percent: number;
  labelKey: string;
  checks: PasswordCheck[];
};

const hasLetter = (s: string): boolean => /[A-Za-z]/.test(s);
const hasDigit = (s: string): boolean => /[0-9]/.test(s);
const hasLower = (s: string): boolean => /[a-z]/.test(s);
const hasUpper = (s: string): boolean => /[A-Z]/.test(s);
const hasSymbol = (s: string): boolean => /[^A-Za-z0-9]/.test(s);

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const length = [...password].length;
  const letter = hasLetter(password);
  const digit = hasDigit(password);
  const mixed = hasLower(password) && hasUpper(password);
  const symbol = hasSymbol(password);
  const notTooLong = length <= AUTH_PASSWORD_MAX;

  const checks: PasswordCheck[] = [
    {
      id: 'length',
      labelKey: 'auth_pw_check_length',
      ok: length >= AUTH_PASSWORD_MIN && notTooLong
    },
    { id: 'letter', labelKey: 'auth_pw_check_letter', ok: letter },
    { id: 'digit', labelKey: 'auth_pw_check_digit', ok: digit },
    { id: 'mixed', labelKey: 'auth_pw_check_mixed', ok: mixed },
    { id: 'symbol', labelKey: 'auth_pw_check_symbol', ok: symbol }
  ];

  let score = 0;
  if (length >= AUTH_PASSWORD_MIN && notTooLong) score += 1;
  if (letter && digit) score += 1;
  if (mixed) score += 1;
  if (symbol || length >= 12) score += 1;

  const labelKey =
    score <= 1
      ? 'auth_pw_strength_weak'
      : score === 2
        ? 'auth_pw_strength_fair'
        : score === 3
          ? 'auth_pw_strength_good'
          : 'auth_pw_strength_strong';

  return {
    score,
    percent: Math.min(100, (score / 4) * 100),
    labelKey,
    checks
  };
}
