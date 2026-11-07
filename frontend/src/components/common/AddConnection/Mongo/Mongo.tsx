import type { CreateConnectionRequestType, MongoOptionsType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import locales from '@/locales';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { Box, Button, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import type { JSX, ReactNode } from 'react';
import * as v from 'valibot';

import {
  ConnectionFormBodyStyled,
  ConnectionFormCheckboxRowStyled,
  ConnectionFormContainerStyled
} from '../AddConnection.styled';
import type { ConnectionEnv } from '@/types';
import type { ConnectionSettingsProps } from '../types';

const ENV_OPTIONS = [
  { value: 'none', label: locales.connection_env_none },
  { value: 'dev', label: locales.connection_env_dev },
  { value: 'uat', label: locales.connection_env_uat },
  { value: 'prod', label: locales.connection_env_prod }
];

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant='overline' color='textSubdued' sx={{ lineHeight: 1.6 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

const formSchema = v.pipe(
  v.object({
    isPing: v.boolean(),
    rememberPassword: v.boolean(),
    name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
    env: v.picklist(['', 'dev', 'uat', 'prod']),
    mode: v.picklist(['host', 'uri']),
    uri: v.string(),
    host: v.string(),
    port: v.string(),
    username: v.string(),
    password: v.string(),
    authSource: v.string(),
    database: v.string(),
    tls: v.boolean(),
    tlsInsecure: v.boolean()
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
      (i) => i.mode === 'host' || /^mongodb(\+srv)?:\/\//.test(i.uri),
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

  const form = useForm({
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }): void => {
      const common = {
        password: value.password,
        database: value.database,
        tls: value.tls,
        tlsInsecure: value.tls && value.tlsInsecure
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
      form.reset();
    },
    defaultValues: {
      isPing: false,
      rememberPassword: false,
      name: connection?.name ?? '',
      env: connection?.env ?? '',
      mode: options?.uri ? 'uri' : 'host',
      uri: options?.uri ?? '',
      host: options?.host ?? '',
      port: options?.port?.toString() ?? '27017',
      username: options?.username ?? '',
      password: '',
      authSource: options?.authSource ?? '',
      database: options?.database ?? '',
      tls: options?.tls ?? false,
      tlsInsecure: options?.tlsInsecure ?? false
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
      <ConnectionFormBodyStyled sx={{ gap: 2 }}>
        <Section title={locales.connection_section_general}>
          {text('name', locales.name)}
          <form.Field name='env'>
            {(field): JSX.Element => (
              <SelectInput
                label={locales.connection_env}
                testId='connection-env-select'
                value={field.state.value || 'none'}
                options={ENV_OPTIONS}
                onChange={(o): void =>
                  field.handleChange(
                    (String((o as { value: unknown }).value) === 'none'
                      ? ''
                      : String((o as { value: unknown }).value)) as ConnectionEnv
                  )
                }
                helpertext={field.state.value === 'prod' ? locales.connection_env_prod_hint : undefined}
              />
            )}
          </form.Field>
        </Section>

        <Section title={locales.connection_section_server}>
          <form.Field name='mode'>
            {(field): JSX.Element => (
              <SelectInput
                label={locales.mongo_connect_with}
                testId='mongo-mode'
                value={field.state.value}
                options={[
                  { value: 'host', label: locales.mongo_mode_host },
                  { value: 'uri', label: locales.mongo_mode_uri }
                ]}
                onChange={(o): void => field.handleChange((o as { value: 'host' | 'uri' }).value)}
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.values.mode}>
            {(mode): JSX.Element =>
              mode === 'uri' ? (
                text('uri', locales.mongo_uri, { placeholder: 'mongodb+srv://cluster.example.net/app' })
              ) : (
                <>
                  <Stack direction='row' spacing={2}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>{text('host', locales.host, { placeholder: 'localhost' })}</Box>
                    <Box sx={{ width: 120 }}>
                      {text('port', locales.port, { placeholder: '27017', type: 'number' })}
                    </Box>
                  </Stack>
                </>
              )
            }
          </form.Subscribe>
          {text('database', locales.mongo_default_database, { placeholder: 'test' })}
        </Section>

        <Section title={locales.connection_section_auth}>
          <form.Subscribe selector={(state) => state.values.mode}>
            {(mode): JSX.Element => (
              <Stack direction='row' spacing={2}>
                {mode === 'host' && <Box sx={{ flex: 1, minWidth: 0 }}>{text('username', locales.username)}</Box>}
                <Box sx={{ flex: 1, minWidth: 0 }}>{text('password', locales.password, { type: 'password' })}</Box>
              </Stack>
            )}
          </form.Subscribe>
          <form.Subscribe selector={(state) => state.values.mode}>
            {(mode): JSX.Element | null =>
              mode === 'host' ? text('authSource', locales.mongo_auth_source, { placeholder: 'admin' }) : null
            }
          </form.Subscribe>
          <ConnectionFormCheckboxRowStyled>
            {check('rememberPassword', locales.remember_password)}
          </ConnectionFormCheckboxRowStyled>
        </Section>

        <Section title={locales.connection_section_security}>
          <ConnectionFormCheckboxRowStyled sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            {check('tls', locales.redis_tls)}
            <form.Subscribe selector={(state) => state.values.tls}>
              {(tls): JSX.Element | null =>
                tls ? <Box sx={{ pl: 3 }}>{check('tlsInsecure', locales.redis_tls_insecure)}</Box> : null
              }
            </form.Subscribe>
          </ConnectionFormCheckboxRowStyled>
        </Section>
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
          size='small'
          variant='outlined'
        >
          {locales.test}
        </Button>
        <Stack spacing={1} direction='row'>
          <Button type='button' size='small' onClick={onClose}>
            {locales.cancel}
          </Button>
          <Button
            type='submit'
            data-testid='create-connection'
            loadingPosition='start'
            disabled={submitLoading}
            loading={submitLoading}
            size='small'
            variant='contained'
          >
            {submitLabel ?? (connection ? locales.update : locales.create)}
          </Button>
        </Stack>
      </ModalFooter>
    </ConnectionFormContainerStyled>
  );
}
