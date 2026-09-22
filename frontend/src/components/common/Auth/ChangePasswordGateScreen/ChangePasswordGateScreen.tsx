import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import AuthShell from '@/components/common/Auth/AuthShell/AuthShell';
import { AuthShellSubmitStyled } from '@/components/common/Auth/AuthShell/AuthShell.styled';
import PasswordStrengthMeter from '@/components/common/Auth/PasswordStrengthMeter/PasswordStrengthMeter';
import { authForcedChangePasswordSchema } from '@/core/auth/passwordSchema';
import { applyUserWorkspaceScope } from '@/core/storage/applyUserWorkspace';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

export default function ChangePasswordGateScreen(): JSX.Element {
  const applyStatus = useAuthStore((s) => s.applyStatus);
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (value: { password: string; confirm: string }) =>
      api.auth.changePassword('', value.password, value.confirm)
  });

  const form = useForm({
    validators: {
      onSubmit: authForcedChangePasswordSchema
    },
    defaultValues: {
      password: '',
      confirm: ''
    },
    onSubmit: async ({ value }): Promise<void> => {
      setSubmitError(null);
      try {
        await mutateAsync(value);
        const status = await api.auth.getStatus();
        applyStatus(status);
        await applyUserWorkspaceScope(status.authenticated ? status.user?.id : undefined);
        await queryClient.invalidateQueries();
        toast.success(locales.auth_password_changed);
      } catch {
        setSubmitError(locales.auth_password_change_failed);
        toast.error(locales.auth_password_change_failed);
      }
    }
  });

  return (
    <AuthShell title={locales.auth_change_password} subtitle={locales.auth_change_password_hint}>
      <Box
        component='form'
        onSubmit={(e): void => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <form.Field name='password'>
          {(field): JSX.Element => (
            <Box>
              <FieldInput
                name='password'
                type='password'
                label={locales.auth_new_password}
                value={field.state.value}
                error={field.state.meta.errors.length > 0}
                autoFocus
                fullWidth
                onChange={(e): void => field.handleChange(e.target.value)}
                inputProps={{ 'data-testid': 'auth-new-password' }}
              />
              <PasswordStrengthMeter password={field.state.value} />
              <FormError mb={0} errors={field.state.meta.errors} />
            </Box>
          )}
        </form.Field>

        <form.Field name='confirm'>
          {(field): JSX.Element => (
            <Box>
              <FieldInput
                name='confirm'
                type='password'
                label={locales.auth_confirm_password}
                value={field.state.value}
                error={field.state.meta.errors.length > 0}
                fullWidth
                onChange={(e): void => field.handleChange(e.target.value)}
                inputProps={{ 'data-testid': 'auth-confirm-password' }}
              />
              <FormError mb={0} errors={field.state.meta.errors} />
            </Box>
          )}
        </form.Field>

        {submitError ? <FormError mb={0} errors={[submitError]} /> : null}

        <form.Subscribe selector={(state): boolean => !state.isSubmitting}>
          {(ready): JSX.Element => (
            <AuthShellSubmitStyled
              type='submit'
              variant='contained'
              fullWidth
              disabled={!ready || isPending}
              data-testid='auth-change-password-submit'
            >
              {isPending ? locales.auth_saving_password : locales.auth_change_password}
            </AuthShellSubmitStyled>
          )}
        </form.Subscribe>
      </Box>
    </AuthShell>
  );
}
