import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';

type Security = 'starttls' | 'tls' | 'none';

/** The outgoing mail account every schedule sends through. Only an admin can read or change it. */
export default function SmtpForm({ onSaved }: { onSaved: () => void }): JSX.Element {
  const { data, error } = useQuery({ queryKey: ['smtp-settings'], queryFn: () => api.dashboard.getSmtpSettings() });
  const [draft, setDraft] = useState<{ host: string; port: string; username: string; fromAddress: string; security: Security } | null>(null);
  const [password, setPassword] = useState('');
  const form = draft ?? (data && { host: data.host, port: String(data.port), username: data.username, fromAddress: data.fromAddress, security: data.security });

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      api.dashboard.saveSmtpSettings({
        host: form!.host,
        port: Number(form!.port),
        username: form!.username,
        fromAddress: form!.fromAddress,
        security: form!.security,
        ...(password ? { password } : {})
      }),
    onSuccess: () => {
      setPassword('');
      toast.success(locales.schedule_smtp_saved);
      onSaved();
    },
    onError: () => toast.error(locales.action_failed)
  });

  if (error) return <Typography variant='caption' color='error'>{locales.schedule_smtp_admin_only}</Typography>;
  if (!form || !data) return <Typography variant='caption'>…</Typography>;

  const set = (patch: Partial<typeof form>): void => setDraft({ ...form, ...patch });
  const field = (key: 'host' | 'port' | 'username' | 'fromAddress', label: string, type = 'text'): JSX.Element => (
    <FieldInput
      size='small'
      type={type}
      placeholder={label}
      value={form[key]}
      onChange={(event) => set({ [key]: event.target.value })}
      inputProps={{ 'aria-label': label, 'data-testid': `smtp-${key}` }}
      mb={0}
      sx={{ flex: 1, minWidth: 140 }}
    />
  );

  return (
    <Stack spacing={1} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }} data-testid='smtp-form'>
      <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {field('host', locales.smtp_host)}
        {field('port', locales.smtp_port, 'number')}
      </Stack>
      <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {field('username', locales.smtp_username)}
        <FieldInput
          size='small'
          type='password'
          placeholder={data.hasPassword ? locales.smtp_password_keep : locales.smtp_password}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          inputProps={{ 'aria-label': locales.smtp_password, 'data-testid': 'smtp-password' }}
          mb={0}
          sx={{ flex: 1, minWidth: 140 }}
        />
      </Stack>
      {field('fromAddress', locales.smtp_from)}
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <ToggleButtonGroup exclusive size='small' value={form.security} onChange={(_, next: Security | null) => next && set({ security: next })}>
          <ToggleButton value='starttls' data-testid='smtp-security-starttls'>STARTTLS</ToggleButton>
          <ToggleButton value='tls' data-testid='smtp-security-tls'>TLS</ToggleButton>
          <ToggleButton value='none' data-testid='smtp-security-none'>{locales.smtp_security_none}</ToggleButton>
        </ToggleButtonGroup>
        <div style={{ flex: 1 }} />
        <Button size='small' variant='contained' disabled={isPending || !form.host || !form.fromAddress} onClick={() => save()} data-testid='smtp-save'>
          {locales.share_save}
        </Button>
      </Stack>
    </Stack>
  );
}
