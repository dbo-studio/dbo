import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import AuthShell from '@/components/common/Auth/AuthShell/AuthShell';
import { AuthShellSubmitStyled } from '@/components/common/Auth/AuthShell/AuthShell.styled';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import * as v from 'valibot';

const loginSchema = v.object({
  email: v.pipe(v.string(), v.email('Valid email is required')),
  password: v.pipe(v.string(), v.minLength(1, 'Password is required'))
});

export default function AuthGateScreen(): JSX.Element {
  const applyStatus = useAuthStore((s) => s.applyStatus);
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (value: { email: string; password: string }) => api.auth.login(value.email, value.password)
  });

  const form = useForm({
    validators: {
      onSubmit: loginSchema
    },
    defaultValues: {
      email: '',
      password: ''
    },
    onSubmit: async ({ value }): Promise<void> => {
      setSubmitError(null);
      try {
        await mutateAsync(value);
        const status = await api.auth.getStatus();
        applyStatus(status);
        await queryClient.invalidateQueries();
      } catch {
        setSubmitError(locales.auth_login_failed);
        toast.error(locales.auth_login_failed);
      }
    }
  });

  return (
    <AuthShell title={locales.auth_sign_in} subtitle={locales.auth_local_hint}>
      <Box
        component='form'
        onSubmit={(e): void => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
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
                autoFocus
                fullWidth
                onChange={(e): void => field.handleChange(e.target.value)}
                inputProps={{ 'data-testid': 'auth-email' }}
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
                inputProps={{ 'data-testid': 'auth-password' }}
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
              data-testid='auth-submit'
            >
              {isPending ? locales.auth_signing_in : locales.auth_sign_in}
            </AuthShellSubmitStyled>
          )}
        </form.Subscribe>
      </Box>
    </AuthShell>
  );
}
