import type { AdminUserType } from '@/api/adminUsers/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import PasswordStrengthMeter from '@/components/common/Auth/PasswordStrengthMeter/PasswordStrengthMeter';
import { adminResetPasswordSchema } from '@/core/auth/passwordSchema';
import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import * as v from 'valibot';
import {
  AdministrationUserActionsStyled,
  AdministrationUserCardStyled,
  AdministrationUserHeaderStyled
} from './AdministrationPanel.styled';

export const adminRoleOptions: SelectInputOption[] = [
  { label: locales.admin_role_member, value: 'member' },
  { label: locales.admin_role_admin, value: 'admin' }
];

export type AdminUserRowProps = {
  user: AdminUserType;
  selfId?: string;
  pending: boolean;
  onUpdate: (id: string, payload: { role?: string; disabled?: boolean; password?: string }) => Promise<void>;
};

export default function AdminUserRow({ user, selfId, pending, onUpdate }: AdminUserRowProps): JSX.Element {
  const disabled = Boolean(user.disabledAt);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | undefined>();

  const handleReset = async (): Promise<void> => {
    const parsed = v.safeParse(adminResetPasswordSchema, { password: resetPassword });
    if (!parsed.success) {
      setResetError(parsed.issues[0]?.message ?? locales.auth_password_rules);
      return;
    }

    setResetError(undefined);
    await onUpdate(user.id, { password: resetPassword });
    setResetPassword('');
  };

  return (
    <AdministrationUserCardStyled>
      <AdministrationUserHeaderStyled>
        <Box>
          <Typography color='textTitle' variant='subtitle2'>
            {user.email}
          </Typography>
          <Typography color='textText' variant='caption'>
            {disabled ? locales.admin_disabled : locales.admin_active}
            {user.mustChangePassword ? ` · ${locales.admin_must_change}` : ''}
          </Typography>
        </Box>
        <Button
          variant='outlined'
          size='small'
          disabled={user.id === selfId || pending}
          onClick={(): void => {
            void onUpdate(user.id, { disabled: !disabled });
          }}
        >
          {disabled ? locales.admin_enable : locales.admin_disable}
        </Button>
      </AdministrationUserHeaderStyled>

      <AdministrationUserActionsStyled>
        <SelectInput
          label={locales.admin_role}
          value={user.role}
          disabled={pending}
          options={adminRoleOptions}
          onChange={(option): void => {
            const next = (option as SelectInputOption | null)?.value;
            if (typeof next !== 'string' || next === user.role) {
              return;
            }
            void onUpdate(user.id, { role: next });
          }}
        />

        <Box>
          <FieldInput
            label={locales.admin_temp_password}
            type='password'
            value={resetPassword}
            error={Boolean(resetError)}
            fullWidth
            onChange={(e): void => {
              setResetPassword(e.target.value);
              setResetError(undefined);
            }}
          />
          <PasswordStrengthMeter password={resetPassword} />
          {resetError ? <FormError mb={0} errors={[resetError]} /> : null}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant='outlined'
            size='small'
            disabled={pending || resetPassword.length === 0}
            onClick={(): void => {
              void handleReset();
            }}
          >
            {locales.admin_reset_password}
          </Button>
        </Box>
      </AdministrationUserActionsStyled>
    </AdministrationUserCardStyled>
  );
}
