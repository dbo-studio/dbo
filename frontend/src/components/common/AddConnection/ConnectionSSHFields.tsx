import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import type { JSX } from 'react';

import { ConnectionFormRowStyled } from './AddConnection.styled';
import SSLCertField from './SSLCertField';
import { SSH_AUTH_METHODS, type SSHFormValues, type SSHHopFormValues } from './ssh';
import type { ConnectionSSHFieldsProps } from './types';

type HopFieldsProps = {
  prefix: string;
  value: SSHHopFormValues;
  onChange: (next: SSHHopFormValues) => void;
};

function HopFields({ prefix, value, onChange }: HopFieldsProps): JSX.Element {
  const set = (patch: Partial<SSHHopFormValues>): void => onChange({ ...value, ...patch });
  const options: SelectInputOption[] = SSH_AUTH_METHODS.map((item) => ({
    value: item.value,
    label: locales[item.labelKey]
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }} data-testid={`${prefix}-fields`}>
      <ConnectionFormRowStyled>
        <FieldInput
          name={`${prefix}Host`}
          label={locales.ssh_host}
          value={value.host}
          onChange={(e): void => set({ host: e.target.value })}
        />
        <FieldInput
          name={`${prefix}Port`}
          label={locales.port}
          type='number'
          placeholder='22'
          value={value.port}
          onChange={(e): void => set({ port: e.target.value })}
        />
      </ConnectionFormRowStyled>
      <FieldInput
        name={`${prefix}Username`}
        label={locales.username}
        fullWidth={true}
        value={value.username}
        onChange={(e): void => set({ username: e.target.value })}
      />
      <Typography variant='caption' color='textText'>
        {locales.ssh_auth_method}
      </Typography>
      <SelectInput
        testId={`${prefix}-auth-select`}
        classNamePrefix={`${prefix}-auth`}
        value={value.authMethod}
        options={options}
        onChange={(option): void => {
          const next = (option as SelectInputOption | null)?.value;
          if (typeof next === 'string') {
            set({ authMethod: next });
          }
        }}
      />
      {value.authMethod === 'password' && (
        <FieldInput
          name={`${prefix}Password`}
          label={locales.password}
          fullWidth={true}
          type='password'
          placeholder={value.passwordSet ? locales.ssh_secret_keep : undefined}
          value={value.password}
          onChange={(e): void => set({ password: e.target.value })}
        />
      )}
      {value.authMethod === 'key' && (
        <>
          <SSLCertField
            name={`${prefix}PrivateKey`}
            testId={`${prefix}-private-key`}
            label={locales.ssh_private_key}
            value={value.privateKey}
            placeholder={value.privateKeySet ? locales.ssh_secret_keep : locales.ssh_private_key_placeholder}
            onChange={(next): void => set({ privateKey: next })}
          />
          <FieldInput
            name={`${prefix}Passphrase`}
            label={locales.ssh_passphrase}
            fullWidth={true}
            type='password'
            placeholder={value.passphraseSet ? locales.ssh_secret_keep : undefined}
            value={value.passphrase}
            onChange={(e): void => set({ passphrase: e.target.value })}
          />
        </>
      )}
      {value.authMethod === 'agent' && (
        <Typography variant='caption' color='textSecondary'>
          {locales.ssh_auth_agent_help}
        </Typography>
      )}
    </Box>
  );
}

export default function ConnectionSSHFields({ value, onChange }: ConnectionSSHFieldsProps): JSX.Element {
  const update = (patch: Partial<SSHFormValues>): void => onChange({ ...value, ...patch });

  return (
    <Box data-testid='connection-ssh-fields' sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FormControlLabel
        control={
          <Checkbox
            size='small'
            checked={value.enabled}
            slotProps={{ input: { 'data-testid': 'ssh-enabled' } as object }}
            onChange={(e): void => update({ enabled: e.target.checked })}
          />
        }
        label={locales.ssh_use_tunnel}
      />
      {value.enabled && (
        <>
          <Typography variant='caption' color='textSecondary'>
            {locales.ssh_tunnel_help}
          </Typography>
          <HopFields prefix='ssh' value={value} onChange={(hop): void => update(hop)} />
          <FormControlLabel
            control={
              <Checkbox
                size='small'
                checked={value.jumpEnabled}
                slotProps={{ input: { 'data-testid': 'ssh-jump-enabled' } as object }}
                onChange={(e): void => update({ jumpEnabled: e.target.checked })}
              />
            }
            label={locales.ssh_use_jump}
          />
          {value.jumpEnabled && (
            <HopFields prefix='sshJump' value={value.jump} onChange={(jump): void => update({ jump })} />
          )}
        </>
      )}
    </Box>
  );
}
