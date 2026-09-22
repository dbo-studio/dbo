import api from '@/api';
import type { UserPermissions } from '@/api/auth/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import PasswordStrengthMeter from '@/components/common/Auth/PasswordStrengthMeter/PasswordStrengthMeter';
import { defaultMemberPermissions } from '@/core/auth/defaultPermissions';
import { adminCreateUserSchema } from '@/core/auth/passwordSchema';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box, Button, Divider, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import AdminConnectionShares from './AdminConnectionShares/AdminConnectionShares';
import AdminUserPermissions from './AdminUserPermissions/AdminUserPermissions';
import { AdminUserPermissionHeaderCells } from './AdminUserPermissions/AdminUserPermissionCells';
import AdminUserRow, { adminRoleOptions } from './AdminUserRow/AdminUserRow';
import {
  AdministrationFormFooterStyled,
  AdministrationFormStyled,
  AdministrationUserTableContainerStyled
} from './AdministrationPanel.styled';

export default function AdministrationPanel(): JSX.Element {
  const selfId = useAuthStore((s) => s.user?.id);
  const applyStatus = useAuthStore((s) => s.applyStatus);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.adminUsers.listUsers
  });

  const createMutation = useMutation({
    mutationFn: api.adminUsers.createUser,
    onSuccess: async () => {
      toast.success(locales.admin_user_created);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error(locales.admin_create_failed)
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: {
        role?: string;
        permissions?: UserPermissions;
        disabled?: boolean;
        password?: string;
        totpDisabled?: boolean;
      };
    }) => api.adminUsers.updateUser(id, payload),
    onSuccess: async (_data, variables) => {
      toast.success(locales.admin_user_updated);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      if (variables.id === selfId && (variables.payload.role != null || variables.payload.permissions != null)) {
        const status = await api.auth.getStatus();
        applyStatus(status);
      }
    },
    onError: () => toast.error(locales.admin_update_failed)
  });

  const form = useForm({
    validators: {
      onSubmit: adminCreateUserSchema
    },
    defaultValues: {
      email: '',
      password: '',
      role: 'member',
      permissions: defaultMemberPermissions
    },
    onSubmit: async ({ value, formApi }): Promise<void> => {
      await createMutation.mutateAsync({
        email: value.email,
        password: value.password,
        role: value.role,
        permissions: value.role === 'admin' ? undefined : value.permissions
      });
      formApi.reset();
    }
  });

  return (
    <Box>
      <Typography color='textTitle' variant='subtitle2' sx={{ mb: 0.5 }}>
        {locales.admin_create_user}
      </Typography>
      <Typography color='textText' variant='caption' sx={{ display: 'block', mb: 2 }}>
        {locales.admin_create_user_hint}
      </Typography>

      <AdministrationFormStyled
        component='form'
        onSubmit={(e): void => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field name='email'>
          {(field): JSX.Element => (
            <Box>
              <FieldInput
                name='email'
                type='email'
                label={locales.email}
                value={field.state.value}
                error={field.state.meta.errors.length > 0}
                fullWidth
                inputProps={{ 'data-testid': 'admin-create-email' }}
                onChange={(e): void => field.handleChange(e.target.value)}
              />
              <FormError mb={0} errors={field.state.meta.errors} />
            </Box>
          )}
        </form.Field>

        <form.Field name='password'>
          {(field): JSX.Element => (
            <Box>
              <FieldInput
                name='password'
                type='password'
                label={locales.admin_temp_password}
                value={field.state.value}
                error={field.state.meta.errors.length > 0}
                fullWidth
                inputProps={{ 'data-testid': 'admin-create-password' }}
                onChange={(e): void => field.handleChange(e.target.value)}
              />
              <PasswordStrengthMeter password={field.state.value} />
              <FormError mb={0} errors={field.state.meta.errors} />
            </Box>
          )}
        </form.Field>

        <form.Field name='role'>
          {(field): JSX.Element => (
            <SelectInput
              label={locales.admin_role}
              value={field.state.value}
              options={adminRoleOptions}
              onChange={(option): void => {
                const next = (option as SelectInputOption | null)?.value;
                if (typeof next === 'string') {
                  field.handleChange(next);
                }
              }}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.role}>
          {(role): JSX.Element =>
            role === 'member' ? (
              <form.Field name='permissions'>
                {(field): JSX.Element => (
                  <Box data-testid='admin-create-permissions'>
                    <Typography color='textTitle' variant='caption' sx={{ display: 'block', mb: 0.75 }}>
                      {locales.admin_permissions}
                    </Typography>
                    <AdminUserPermissions
                      value={field.state.value}
                      testIdPrefix='admin-create-perm'
                      onChange={(next): void => field.handleChange(next)}
                    />
                  </Box>
                )}
              </form.Field>
            ) : (
              <></>
            )
          }
        </form.Subscribe>

        <AdministrationFormFooterStyled>
          <form.Subscribe selector={(state): boolean => !state.isSubmitting}>
            {(ready): JSX.Element => (
              <Button
                type='submit'
                variant='contained'
                size='small'
                data-testid='admin-create-submit'
                disabled={!ready || createMutation.isPending}
              >
                {locales.admin_create_user}
              </Button>
            )}
          </form.Subscribe>
        </AdministrationFormFooterStyled>
      </AdministrationFormStyled>

      <Divider sx={{ mb: 2 }} />

      <Typography color='textTitle' variant='subtitle2' sx={{ mb: 1.5 }}>
        {locales.admin_users}
      </Typography>

      {isLoading ? (
        <Typography color='textText' variant='body2'>
          {locales.loading}
        </Typography>
      ) : (
        <AdministrationUserTableContainerStyled>
          <Table size='small' data-testid='admin-users-table' aria-label={locales.admin_users}>
            <TableHead>
              <TableRow>
                <TableCell>{locales.email}</TableCell>
                <TableCell>{locales.admin_role}</TableCell>
                <AdminUserPermissionHeaderCells />
                <TableCell>{locales.admin_status}</TableCell>
                <TableCell>{locales.admin_2fa}</TableCell>
                <TableCell align='right'>{locales.admin_actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <AdminUserRow
                  key={user.id}
                  user={user}
                  selfId={selfId}
                  pending={updateMutation.isPending}
                  onUpdate={async (id, payload): Promise<void> => {
                    await updateMutation.mutateAsync({ id, payload });
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </AdministrationUserTableContainerStyled>
      )}

      <Divider sx={{ my: 3 }} />

      <Box data-settings-id='admin.shares'>
        <Typography color='textTitle' variant='subtitle2' sx={{ mb: 0.5 }}>
          {locales.admin_shares}
        </Typography>
        <Typography color='textText' variant='caption' sx={{ display: 'block', mb: 2 }}>
          {locales.admin_shares_hint}
        </Typography>
        <AdminConnectionShares />
      </Box>
    </Box>
  );
}
