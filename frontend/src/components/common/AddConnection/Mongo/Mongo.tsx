import type { CreateConnectionRequestType, MongoOptionsType } from '@/api/connection/types';
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
import ConnectionModeSwitch, { type ConnectionMode } from '../ConnectionModeSwitch';
import ConnectionSSHFields from '../ConnectionSSHFields';
import ConnectionTLSFields from '../ConnectionTLSFields';
import { sshFormDefaults, sshFormSchema, sshOptionsFromForm } from '../ssh';
import type { ConnectionSettingsProps } from '../types';

const formSchema = v.pipe(
  v.object({
    isPing: v.boolean(),
    rememberPassword: v.boolean(),
    name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
    env: v.picklist(['', 'dev', 'uat', 'prod']),
    mode: v.picklist(['manual', 'uri']),
    uri: v.string(),
    host: v.string(),
    port: v.string(),
    username: v.string(),
    password: v.string(),
    authSource: v.string(),
    database: v.string(),
    tls: v.boolean(),
    tlsInsecure: v.boolean(),
    ssh: sshFormSchema
  }),
  v.forward(
    v.partialCheck([['mode'], ['host']], (i) => i.mode === 'uri' || i.host.length > 0, 'At least 1 character'),
    ['host']
  ),
  v.forward(
    v.partialCheck(
      [['mode'], ['port']],
      (i) => i.mode === 'uri' || (/^\d+$/.test(i.port) && Number(i.port) >= 1 && Number(i.port) <= 65535),
      'Expected a number between 1 and 65535'
    ),
    ['port']
  ),
  v.forward(
    v.partialCheck(
      [['mode'], ['uri']],
      (i) => i.mode === 'manual' || /^mongodb(\+srv)?:\/\//.test(i.uri),
      'Must start with mongodb:// or mongodb+srv://'
    ),
    ['uri']
  )
);

export default function Mongo({
  connection,
  submitLabel,
  engine = 'mongodb',
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const options: MongoOptionsType | undefined = connection?.options;
  const connectionType = connection?.type ?? engine;
  const initialMode: ConnectionMode = options?.uri ? 'uri' : 'manual';

  const form = useForm({
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }): void => {
      const common = {
        password: value.password,
        database: value.database,
        tls: value.tls,
        tlsInsecure: value.tls && value.tlsInsecure,
        ssh: sshOptionsFromForm(value.ssh)
      };
      const data = {
        name: value.name,
        type: connectionType,
        rememberPassword: value.rememberPassword,
        env: value.env,
        options:
          value.mode === 'uri'
            ? { uri: value.uri.trim(), ...common }
            : {
                host: value.host,
                port: Number(value.port),
                username: value.username,
                authSource: value.authSource,
                ...common
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
      mode: initialMode,
      uri: options?.uri ?? '',
      host: options?.host ?? '',
      port: options?.port?.toString() ?? '27017',
      username: options?.username ?? '',
      password: '',
      authSource: options?.authSource ?? '',
      database: options?.database ?? '',
      tls: options?.tls ?? false,
      tlsInsecure: options?.tlsInsecure ?? false,
      ssh: sshFormDefaults(options?.ssh)
    }
  });

  const text = (
    name: 'name' | 'uri' | 'host' | 'port' | 'username' | 'password' | 'authSource' | 'database',
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
                <form.Field name='mode'>
                  {(field): JSX.Element => (
                    <ConnectionModeSwitch value={field.state.value} onChange={(next): void => field.handleChange(next)} />
                  )}
                </form.Field>
                <form.Subscribe selector={(state) => state.values.mode}>
                  {(mode): JSX.Element =>
                    mode === 'uri' ? (
                      text('uri', locales.connection_mode_uri, { placeholder: 'mongodb+srv://cluster.example.net/app' })
                    ) : (
                      <ConnectionFormRowStyled hostPort>
                        {text('host', locales.host, { placeholder: 'localhost' })}
                        {text('port', locales.port, { placeholder: '27017', type: 'number' })}
                      </ConnectionFormRowStyled>
                    )
                  }
                </form.Subscribe>
                {text('database', locales.mongo_default_database, { placeholder: 'test' })}
              </ConnectionFormSection>
              <ConnectionFormSection title={locales.connection_section_auth}>
                <form.Subscribe selector={(state) => state.values.mode}>
                  {(mode): JSX.Element => (
                    <ConnectionFormRowStyled>
                      {mode === 'manual' ? text('username', locales.username) : <span />}
                      {text('password', locales.password, { type: 'password' })}
                    </ConnectionFormRowStyled>
                  )}
                </form.Subscribe>
                <form.Subscribe selector={(state) => state.values.mode}>
                  {(mode): JSX.Element | null =>
                    mode === 'manual' ? text('authSource', locales.mongo_auth_source, { placeholder: 'admin' }) : null
                  }
                </form.Subscribe>
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
