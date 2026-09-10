import * as v from 'valibot';
import { AUTH_PASSWORD_MAX, AUTH_PASSWORD_MIN } from './passwordStrength';

/** Matches backend passwordpolicy: 8–40, letter + digit. */
export const authPasswordSchema = v.pipe(
  v.string(),
  v.minLength(AUTH_PASSWORD_MIN, 'Password must be at least 8 characters'),
  v.maxLength(AUTH_PASSWORD_MAX, 'Password must be at most 40 characters'),
  v.check((value) => /[A-Za-z]/.test(value), 'Password must include a letter'),
  v.check((value) => /[0-9]/.test(value), 'Password must include a number')
);

export const authChangePasswordSchema = v.pipe(
  v.object({
    currentPassword: v.pipe(v.string(), v.minLength(1, 'Current password is required')),
    password: authPasswordSchema,
    confirm: authPasswordSchema
  }),
  v.forward(
    v.partialCheck([['password'], ['confirm']], (input) => input.password === input.confirm, 'Passwords must match'),
    ['confirm']
  ),
  v.forward(
    v.partialCheck(
      [['password'], ['currentPassword']],
      (input) => input.password !== input.currentPassword,
      'New password must differ from current'
    ),
    ['password']
  )
);

export const adminCreateUserSchema = v.object({
  email: v.pipe(v.string(), v.email('Valid email is required')),
  password: authPasswordSchema,
  role: v.pipe(v.string(), v.picklist(['admin', 'member']))
});

export const adminResetPasswordSchema = v.object({
  password: authPasswordSchema
});
