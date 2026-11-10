import type { CreateConnectionRequestType, RedisOptionsType } from '@/api/connection/types';
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
  tlsInsecure: v.boolean()
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
          tlsInsecure: value.tls && value.tlsInsecure
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
      host: options?.host ?? '',
      port: options?.port?.toString() ?? '6379',
      username: options?.username ?? '',
      password: '',
      database: (options?.database ?? 0).toString(),
      tls: options?.tls ?? false,
      tlsInsecure: options?.tlsInsecure ?? false
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
          <Stack direction='row' spacing={2}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{text('host', locales.host, { placeholder: 'localhost' })}</Box>
            <Box sx={{ width: 120 }}>{text('port', locales.port, { placeholder: '6379', type: 'number' })}</Box>
          </Stack>
          {text('database', locales.database, { type: 'number' })}
        </Section>

        <Section title={locales.connection_section_auth}>
          <Stack direction='row' spacing={2}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{text('username', locales.username)}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{text('password', locales.password, { type: 'password' })}</Box>
          </Stack>
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
