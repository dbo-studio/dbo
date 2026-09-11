import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import AuthShell from '@/components/common/Auth/AuthShell/AuthShell';
import { AuthShellSubmitStyled } from '@/components/common/Auth/AuthShell/AuthShell.styled';
import { applyUserWorkspaceScope } from '@/core/storage/applyUserWorkspace';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import * as v from 'valibot';

const totpSchema = v.object({
  code: v.pipe(v.string(), v.minLength(6, 'Enter the 6-digit code'))
});

export default function TotpGateScreen(): JSX.Element {
  const applyStatus = useAuthStore((s) => s.applyStatus);
  const challengeToken = useAuthStore((s) => s.totpChallengeToken);
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (code: string) => api.auth.loginTotp(challengeToken!, code)
  });

  const form = useForm({
    validators: {
      onSubmit: totpSchema
    },
    defaultValues: {
      code: ''
    },
    onSubmit: async ({ value }): Promise<void> => {
      if (!challengeToken) {
        return;
      }

      setSubmitError(null);
      try {
        await mutateAsync(value.code);
        const status = await api.auth.getStatus();
        applyStatus(status);
        await applyUserWorkspaceScope(status.authenticated ? status.user?.id : undefined);
        await queryClient.invalidateQueries();
      } catch {
        setSubmitError(locales.auth_totp_invalid);
        toast.error(locales.auth_totp_invalid);
      }
    }
  });

  return (
    <AuthShell title={locales.auth_totp_title} subtitle={locales.auth_totp_login_hint}>
      <Box
        component='form'
        onSubmit={(e): void => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <form.Field name='code'>
          {(field): JSX.Element => (
            <Box>
              <FieldInput
                name='code'
                type='text'
                label={locales.auth_totp_code}
                value={field.state.value}
                error={field.state.meta.errors.length > 0}
                autoFocus
                fullWidth
                onChange={(e): void => field.handleChange(e.target.value)}
                inputProps={{ 'data-testid': 'auth-totp-code', inputMode: 'numeric', autoComplete: 'one-time-code' }}
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
              disabled={!ready || isPending || !challengeToken}
              data-testid='auth-totp-submit'
            >
              {isPending ? locales.auth_signing_in : locales.auth_sign_in}
            </AuthShellSubmitStyled>
          )}
        </form.Subscribe>
      </Box>
    </AuthShell>
  );
}
