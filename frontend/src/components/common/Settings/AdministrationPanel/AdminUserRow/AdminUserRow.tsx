import type { AdminUserType } from '@/api/adminUsers/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import Modal from '@/components/base/Modal/Modal';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import PasswordStrengthMeter from '@/components/common/Auth/PasswordStrengthMeter/PasswordStrengthMeter';
import { adminResetPasswordSchema } from '@/core/auth/passwordSchema';
import locales from '@/locales';
import { Button, Chip, IconButton, Menu, MenuItem, Stack, TableCell, TableRow, Typography } from '@mui/material';
import { type JSX, type MouseEvent, useState } from 'react';
import * as v from 'valibot';
import AdminShareConnectionsModal from '../AdminShareConnectionsModal/AdminShareConnectionsModal';
import {
  AdministrationModalContainerStyled,
  AdministrationModalContentStyled,
  AdministrationModalFooterStyled
} from './AdminUserRow.styled';

export const adminRoleOptions: SelectInputOption[] = [
  { label: locales.admin_role_member, value: 'member' },
  { label: locales.admin_role_admin, value: 'admin' }
];

export type AdminUserRowProps = {
  user: AdminUserType;
  selfId?: string;
  pending: boolean;
  onUpdate: (
    id: string,
    payload: { role?: string; disabled?: boolean; password?: string; totpDisabled?: boolean }
  ) => Promise<void>;
};

export default function AdminUserRow({ user, selfId, pending, onUpdate }: AdminUserRowProps): JSX.Element {
  const disabled = Boolean(user.disabledAt);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | undefined>();

  const closeMenu = (): void => {
    setMenuAnchor(null);
  };

  const openMenu = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const closeReset = (): void => {
    setResetOpen(false);
    setResetPassword('');
    setResetError(undefined);
  };

  const handleReset = async (): Promise<void> => {
    if (pending || resetPassword.length === 0) {
      return;
    }

    const parsed = v.safeParse(adminResetPasswordSchema, { password: resetPassword });
    if (!parsed.success) {
      setResetError(parsed.issues[0]?.message ?? locales.auth_password_rules);
      return;
    }

    setResetError(undefined);
    try {
      await onUpdate(user.id, { password: resetPassword });
      closeReset();
    } catch {
      // toast is shown by the mutation
    }
  };

  return (
    <TableRow data-testid={`admin-user-row-${user.email}`}>
      <TableCell sx={{ maxWidth: 240 }}>
        <Typography color='textTitle' variant='body2' noWrap title={user.email}>
          {user.email}
        </Typography>
      </TableCell>
      <TableCell sx={{ width: 148 }}>
        <SelectInput
          value={user.role}
          size='small'
          disabled={pending}
          options={adminRoleOptions}
          testId={`admin-user-role-${user.email}`}
          onChange={(option): void => {
            const next = (option as SelectInputOption | null)?.value;
            if (typeof next !== 'string' || next === user.role) {
              return;
            }
            void onUpdate(user.id, { role: next });
          }}
        />
      </TableCell>
      <TableCell sx={{ width: 160 }}>
        <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
          <Chip
            size='small'
            variant='outlined'
            color={disabled ? 'default' : 'success'}
            label={disabled ? locales.admin_disabled : locales.admin_active}
          />
          {user.mustChangePassword ? (
            <Typography variant='caption' color='warning.main'>
              {locales.admin_must_change}
            </Typography>
          ) : null}
          {user.totpEnabled ? (
            <Typography variant='caption' color='info.main'>
              {locales.auth_totp_enabled_badge}
            </Typography>
          ) : null}
        </Stack>
      </TableCell>
      <TableCell align='right' sx={{ width: 48, px: 0.5 }}>
        <IconButton
          size='small'
          aria-label={locales.admin_actions}
          disabled={pending}
          data-testid={`admin-user-menu-${user.email}`}
          onClick={openMenu}
        >
          <CustomIcon type='ellipsisVertical' size='s' />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            disabled={user.id === selfId}
            data-testid={`admin-user-disable-${user.email}`}
            onClick={(): void => {
              closeMenu();
              void onUpdate(user.id, { disabled: !disabled });
            }}
          >
            {disabled ? locales.admin_enable : locales.admin_disable}
          </MenuItem>
          <MenuItem
            data-testid={`admin-user-reset-password-${user.email}`}
            onClick={(): void => {
              closeMenu();
              setResetOpen(true);
            }}
          >
            {locales.admin_reset_password}
          </MenuItem>
          <MenuItem
            data-testid={`admin-user-share-connections-${user.email}`}
            onClick={(): void => {
              closeMenu();
              setShareOpen(true);
            }}
          >
            {locales.admin_share_connections}
          </MenuItem>
          {user.totpEnabled ? (
            <MenuItem
              data-testid={`admin-user-disable-totp-${user.email}`}
              onClick={(): void => {
                closeMenu();
                void onUpdate(user.id, { totpDisabled: true });
              }}
            >
              {locales.admin_disable_totp}
            </MenuItem>
          ) : null}
        </Menu>
        <Modal open={resetOpen} title={locales.admin_reset_password} onClose={closeReset}>
          <AdministrationModalContainerStyled
            component='form'
            data-testid='admin-reset-password-modal'
            onSubmit={(e): void => {
              e.preventDefault();
              e.stopPropagation();
              void handleReset();
            }}
          >
            <AdministrationModalContentStyled>
              <FieldInput
                label={locales.admin_temp_password}
                type='password'
                value={resetPassword}
                error={Boolean(resetError)}
                fullWidth
                inputProps={{ 'data-testid': 'admin-reset-password-input' }}
                onChange={(e): void => {
                  setResetPassword(e.target.value);
                  setResetError(undefined);
                }}
              />
              <PasswordStrengthMeter password={resetPassword} />
              {resetError ? <FormError mb={0} errors={[resetError]} /> : null}
            </AdministrationModalContentStyled>
            <AdministrationModalFooterStyled>
              <Button type='button' size='small' onClick={closeReset}>
                {locales.cancel}
              </Button>
              <Button
                type='submit'
                variant='contained'
                size='small'
                disabled={pending || resetPassword.length === 0}
                data-testid='admin-reset-password-submit'
              >
                {locales.admin_reset_password}
              </Button>
            </AdministrationModalFooterStyled>
          </AdministrationModalContainerStyled>
        </Modal>
        <AdminShareConnectionsModal
          open={shareOpen}
          userId={user.id}
          userEmail={user.email}
          onClose={(): void => setShareOpen(false)}
        />
      </TableCell>
    </TableRow>
  );
}
