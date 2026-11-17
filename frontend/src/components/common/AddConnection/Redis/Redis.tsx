import type { CreateConnectionRequestType, RedisOptionsType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import locales from '@/locales';
import { Box, Button, Checkbox, FormControlLabel, Stack } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import * as v from 'valibot';

import {
  ConnectionFormBodyStyled,
  ConnectionFormCheckboxRowStyled,
  ConnectionFormContainerStyled,
  ConnectionFormRowStyled
} from '../AddConnection.styled';
import ConnectionEnvField from '../ConnectionEnvField';
import ConnectionFormSection from '../ConnectionFormSection';
import ConnectionFormTabs from '../ConnectionFormTabs';
import ConnectionSSHFields from '../ConnectionSSHFields';
import ConnectionTLSFields from '../ConnectionTLSFields';
import { sshFormDefaults, sshFormSchema, sshOptionsFromForm } from '../ssh';
import type { ConnectionSettingsProps } from '../types';

const number = (min: number, max: number): v.GenericSchema<string> =>
  v.pipe(
    v.string(),
    v.check(
      (s) => /^\d+$/.test(s) && Number(s) >= min && Number(s) <= max,
      `Expected a number between ${min} and ${max}`
    )
  );

const formSchema = v.object({
  isPing: v.boolean(),
  rememberPassword: v.boolean(),
  name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
  env: v.picklist(['', 'dev', 'uat', 'prod']),
  host: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
  port: number(1, 65535),
  username: v.string(),
  password: v.string(),
  database: number(0, 1023),
  tls: v.boolean(),
  tlsInsecure: v.boolean(),
  ssh: sshFormSchema
});

export default function Redis({
  connection,
  submitLabel,
  engine = 'redis',
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const options = connection?.options as RedisOptionsType | undefined;
  const connectionType = connection?.type ?? engine;

  const form = useForm({
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }): void => {
      const data = {
        name: value.name,
        type: connectionType,
        rememberPassword: value.rememberPassword,
        env: value.env,
        options: {
          host: value.host,
          port: Number(value.port),
          username: value.username,
          password: value.password,
          database: Number(value.database),
          tls: value.tls,
          tlsInsecure: value.tls && value.tlsInsecure,
          ssh: sshOptionsFromForm(value.ssh)
        }
      } as CreateConnectionRequestType;

      if (value.isPing) {
        onPing(data);
        return;
      }

      onSubmit(data);
    },
    defaultValues: {
      isPing: false,
      rememberPassword: false,
      name: connection?.name ?? '',
      env: connection?.env ?? '',
      host: options?.host ?? '',
      port: options?.port?.toString() ?? '6379',
      username: options?.username ?? '',
      password: '',
      database: (options?.database ?? 0).toString(),
      tls: options?.tls ?? false,
      tlsInsecure: options?.tlsInsecure ?? false,
      ssh: sshFormDefaults(options?.ssh)
    }
  });

  const text = (
    name: 'name' | 'host' | 'port' | 'username' | 'password' | 'database',
    label: string,
    extra?: { placeholder?: string; type?: string }
  ): JSX.Element => (
    <form.Field name={name}>
      {(field): JSX.Element => (
        <Box>
          <FieldInput
            name={name}
            value={field.state.value}
            error={field.state.meta.errors.length > 0}
            label={label}
            placeholder={extra?.placeholder}
            type={extra?.type}
            onChange={(e): void => field.handleChange(e.target.value)}
          />
          <FormError mb={1} errors={field.state.meta.errors} />
        </Box>
      )}
    </form.Field>
  );

  const check = (name: 'rememberPassword' | 'tls' | 'tlsInsecure', label: string): JSX.Element => (
    <form.Field name={name}>
      {(field): JSX.Element => (
        <FormControlLabel
          control={
            <Checkbox
              checked={field.state.value}
              size='small'
              onChange={(e): void => field.handleChange(e.target.checked)}
            />
          }
          label={label}
        />
      )}
    </form.Field>
  );

  return (
    <ConnectionFormContainerStyled
      component='form'
      onSubmit={(e): void => {
        e.preventDefault();
        e.stopPropagation();
        form.state.values.isPing = false;
        void form.handleSubmit().then();
      }}
    >
      <ConnectionFormBodyStyled>
        <ConnectionFormTabs
          general={
            <>
              {text('name', locales.name)}
              <form.Field name='env'>
                {(field): JSX.Element => (
                  <ConnectionEnvField value={field.state.value} onChange={(next): void => field.handleChange(next)} />
                )}
              </form.Field>
              <ConnectionFormSection title={locales.connection_section_server}>
                <ConnectionFormRowStyled hostPort>
                  {text('host', locales.host, { placeholder: 'localhost' })}
                  {text('port', locales.port, { placeholder: '6379', type: 'number' })}
                </ConnectionFormRowStyled>
                {text('database', locales.database, { type: 'number' })}
              </ConnectionFormSection>
              <ConnectionFormSection title={locales.connection_section_auth}>
                <ConnectionFormRowStyled>
                  {text('username', locales.username)}
                  {text('password', locales.password, { type: 'password' })}
                </ConnectionFormRowStyled>
                <ConnectionFormCheckboxRowStyled>
                  {check('rememberPassword', locales.remember_password)}
                </ConnectionFormCheckboxRowStyled>
              </ConnectionFormSection>
            </>
          }
          ssl={
            <form.Subscribe selector={(state) => ({ tls: state.values.tls, tlsInsecure: state.values.tlsInsecure })}>
              {({ tls, tlsInsecure }): JSX.Element => (
                <ConnectionTLSFields
                  enabled={tls}
                  onEnabledChange={(next): void => form.setFieldValue('tls', next)}
                  insecure={tlsInsecure}
                  onInsecureChange={(next): void => form.setFieldValue('tlsInsecure', next)}
                />
              )}
            </form.Subscribe>
          }
          ssh={
            <form.Subscribe selector={(state) => state.values.ssh}>
              {(ssh): JSX.Element => (
                <ConnectionSSHFields value={ssh} onChange={(next): void => form.setFieldValue('ssh', next)} />
              )}
            </form.Subscribe>
          }
        />
      </ConnectionFormBodyStyled>
      <ModalFooter spread>
        <Button
          type='button'
          data-testid='test-connection'
          loadingPosition='start'
          disabled={pingLoading}
          loading={pingLoading}
          onClick={(): void => {
            form.state.values.isPing = true;
            void form.handleSubmit().then();
          }}
          variant='outlined'
        >
          {locales.test}
        </Button>
        <Stack spacing={1} direction='row'>
          <Button type='button' onClick={onClose}>
            {locales.cancel}
          </Button>
          <Button
            type='submit'
            data-testid='create-connection'
            loadingPosition='start'
            disabled={submitLoading}
            loading={submitLoading}
            variant='contained'
          >
            {submitLabel ?? (connection ? locales.update : locales.create)}
          </Button>
        </Stack>
      </ModalFooter>
    </ConnectionFormContainerStyled>
  );
}
