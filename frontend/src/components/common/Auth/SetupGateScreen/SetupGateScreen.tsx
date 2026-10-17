import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import AuthShell from '@/components/common/Auth/AuthShell/AuthShell';
import { AuthShellSubmitStyled } from '@/components/common/Auth/AuthShell/AuthShell.styled';
import PasswordStrengthMeter from '@/components/common/Auth/PasswordStrengthMeter/PasswordStrengthMeter';
import { authSetupSchema } from '@/core/auth/passwordSchema';
import { applyUserWorkspaceScope } from '@/core/storage/applyUserWorkspace';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

const SETUP_PARAM = 'setup';

/** First run with login on and no account yet: create the admin and sign in. */
export default function SetupGateScreen(): JSX.Element {
  const applyStatus = useAuthStore((s) => s.applyStatus);
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (value: { token: string; email: string; password: string; confirm: string }) =>
      api.auth.setup(value.token.trim(), value.email, value.password, value.confirm)
  });

  const form = useForm({
    validators: {
      onSubmit: authSetupSchema
    },
    defaultValues: {
      // The server log prints a link that carries the token.
      token: new URLSearchParams(window.location.search).get(SETUP_PARAM) ?? '',
      email: '',
      password: '',
      confirm: ''
    },
    onSubmit: async ({ value }): Promise<void> => {
      setSubmitError(null);
      try {
        await mutateAsync(value);
        const url = new URL(window.location.href);
        url.searchParams.delete(SETUP_PARAM);
        window.history.replaceState(null, '', url);
      } catch {
        setSubmitError(locales.auth_setup_failed);
        toast.error(locales.auth_setup_failed);
      }

      // On failure too: another browser may have finished setup first.
      const status = await api.auth.getStatus();
      applyStatus(status);
      await applyUserWorkspaceScope(status.authenticated ? status.user?.id : undefined);
      await queryClient.invalidateQueries();
    }
  });

  return (
    <AuthShell title={locales.auth_setup_title} subtitle={locales.auth_setup_hint}>
      <Box
        component='form'
        onSubmit={(e): void => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <form.Field name='token'>
          {(field): JSX.Element => (
            <Box>
              <FieldInput
                name='token'
                label={locales.auth_setup_token}
                helpertext={locales.auth_setup_token_hint}
                value={field.state.value}
                error={field.state.meta.errors.length > 0}
                autoFocus={!field.state.value}
                fullWidth
                onChange={(e): void => field.handleChange(e.target.value)}
                inputProps={{ 'data-testid': 'auth-setup-token' }}
              />
              <FormError mb={0} errors={field.state.meta.errors} />
            </Box>
          )}
        </form.Field>

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
                inputProps={{ 'data-testid': 'auth-setup-email' }}
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
                label={locales.password}
                value={field.state.value}
                error={field.state.meta.errors.length > 0}
                fullWidth
                onChange={(e): void => field.handleChange(e.target.value)}
                inputProps={{ 'data-testid': 'auth-setup-password' }}
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
                inputProps={{ 'data-testid': 'auth-setup-confirm' }}
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
              data-testid='auth-setup-submit'
            >
              {isPending ? locales.auth_setup_saving : locales.auth_setup_submit}
            </AuthShellSubmitStyled>
          )}
        </form.Subscribe>
      </Box>
    </AuthShell>
  );
}
