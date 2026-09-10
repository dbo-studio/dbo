import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import PasswordStrengthMeter from '@/components/common/Auth/PasswordStrengthMeter/PasswordStrengthMeter';
import { adminCreateUserSchema } from '@/core/auth/passwordSchema';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box, Button, Divider, Typography } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import AdminUserRow, { adminRoleOptions } from './AdminUserRow';
import {
  AdministrationFormFooterStyled,
  AdministrationFormStyled,
  AdministrationUserListStyled
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
    mutationFn: ({ id, payload }: { id: string; payload: { role?: string; disabled?: boolean; password?: string } }) =>
      api.adminUsers.updateUser(id, payload),
    onSuccess: async (_data, variables) => {
      toast.success(locales.admin_user_updated);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      if (variables.id === selfId && variables.payload.role != null) {
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
      role: 'member'
    },
    onSubmit: async ({ value, formApi }): Promise<void> => {
      await createMutation.mutateAsync(value);
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

        <AdministrationFormFooterStyled>
          <form.Subscribe selector={(state): boolean => !state.isSubmitting}>
            {(ready): JSX.Element => (
              <Button type='submit' variant='contained' size='small' disabled={!ready || createMutation.isPending}>
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
        <AdministrationUserListStyled>
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
        </AdministrationUserListStyled>
      )}
    </Box>
  );
}
