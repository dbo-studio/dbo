import type { CreateConnectionRequestType, MysqlOptionsType } from '@/api/connection/types';
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
  ConnectionFormContainerStyled,
  ConnectionFormRowStyled
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
  database: v.string(),
  tls: v.boolean()
});

/** Per-engine form defaults. */
const DEFAULTS: Record<string, { port: string; username: string }> = {
  sqlserver: { port: '1433', username: 'sa' },
  clickhouse: { port: '9000', username: 'default' }
};

/** Form for host/port SQL servers served by the generic driver (SQL Server, ClickHouse). */
export default function HostSql({
  connection,
  submitLabel,
  engine = 'sqlserver',
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const options = connection?.options as MysqlOptionsType | undefined;
  const connectionType = connection?.type ?? engine;
  const defaults = DEFAULTS[connectionType] ?? DEFAULTS.sqlserver;

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
          database: value.database,
          ssl: { mode: value.tls ? 'require' : 'disable' }
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
      port: options?.port?.toString() ?? defaults.port,
      username: options?.username ?? defaults.username,
      password: '',
      database: options?.database ?? '',
      tls: !!options?.ssl?.mode && options.ssl.mode !== 'disable'
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

  const check = (name: 'rememberPassword' | 'tls', label: string): JSX.Element => (
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
                helpertext={
                  field.state.value === 'prod' ? locales.connection_env_prod_hint : locales.connection_env_hint
                }
              />
            )}
          </form.Field>
        </Section>

        <Section title={locales.connection_section_server}>
          <ConnectionFormRowStyled>
            <Box sx={{ flex: 1, minWidth: 0 }}>{text('host', locales.host, { placeholder: 'localhost' })}</Box>
            <Box sx={{ width: 120 }}>{text('port', locales.port, { placeholder: defaults.port, type: 'number' })}</Box>
          </ConnectionFormRowStyled>
          {text('database', locales.database)}
        </Section>

        <Section title={locales.connection_section_auth}>
          <ConnectionFormRowStyled>
            <Box sx={{ flex: 1, minWidth: 0 }}>{text('username', locales.username)}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{text('password', locales.password, { type: 'password' })}</Box>
          </ConnectionFormRowStyled>
          <ConnectionFormCheckboxRowStyled>
            {check('rememberPassword', locales.remember_password)}
          </ConnectionFormCheckboxRowStyled>
        </Section>

        <Section title={locales.connection_section_security}>
          <ConnectionFormCheckboxRowStyled>{check('tls', locales.redis_tls)}</ConnectionFormCheckboxRowStyled>
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
