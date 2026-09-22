import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import PasswordStrengthMeter from '@/components/common/Auth/PasswordStrengthMeter/PasswordStrengthMeter';
import { authChangePasswordSchema } from '@/core/auth/passwordSchema';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box, Button } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

export function AccountPasswordSettings(): JSX.Element | null {
  const mode = useAuthStore((s) => s.mode);
  const applyStatus = useAuthStore((s) => s.applyStatus);
  const [expanded, setExpanded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (value: { currentPassword: string; password: string; confirm: string }) =>
      api.auth.changePassword(value.currentPassword, value.password, value.confirm)
  });

  const form = useForm({
    validators: {
      onSubmit: authChangePasswordSchema
    },
    defaultValues: {
      currentPassword: '',
      password: '',
      confirm: ''
    },
    onSubmit: async ({ value }): Promise<void> => {
      setSubmitError(null);
      try {
        await mutateAsync(value);
        const status = await api.auth.getStatus();
        applyStatus(status);
        form.reset();
        setExpanded(false);
        toast.success(locales.auth_password_changed);
      } catch {
        setSubmitError(locales.auth_password_change_failed);
        toast.error(locales.auth_password_change_failed);
      }
    }
  });

  if (mode !== 'local') {
    return null;
  }

  return (
    <SettingRow
      id='security.account_password'
      label={locales.auth_account_password_label}
      description={locales.auth_account_password_desc}
      control={
        expanded ? (
          <Box
            component='form'
            data-testid='account-password-form'
            onSubmit={(e): void => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 280 }}
          >
            <form.Field name='currentPassword'>
              {(field): JSX.Element => (
                <Box>
                  <FieldInput
                    name='currentPassword'
                    type='password'
                    label={locales.auth_current_password}
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    fullWidth
                    size='small'
                    onChange={(e): void => field.handleChange(e.target.value)}
                    inputProps={{ 'data-testid': 'account-current-password' }}
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
                    label={locales.auth_new_password}
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    fullWidth
                    size='small'
                    onChange={(e): void => field.handleChange(e.target.value)}
                    inputProps={{ 'data-testid': 'account-new-password' }}
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
                    size='small'
                    onChange={(e): void => field.handleChange(e.target.value)}
                    inputProps={{ 'data-testid': 'account-confirm-password' }}
                  />
                  <FormError mb={0} errors={field.state.meta.errors} />
                </Box>
              )}
            </form.Field>
            {submitError ? <FormError mb={0} errors={[submitError]} /> : null}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                size='small'
                onClick={(): void => {
                  form.reset();
                  setExpanded(false);
                  setSubmitError(null);
                }}
              >
                {locales.cancel}
              </Button>
              <Button
                type='submit'
                variant='contained'
                size='small'
                disabled={isPending}
                data-testid='account-password-submit'
              >
                {isPending ? locales.auth_saving_password : locales.auth_change_password}
              </Button>
            </Box>
          </Box>
        ) : (
          <Button
            variant='outlined'
            size='small'
            data-testid='account-password-change'
            onClick={(): void => setExpanded(true)}
          >
            {locales.auth_change_password}
          </Button>
        )
      }
    />
  );
}
