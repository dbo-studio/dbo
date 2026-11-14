import type { CreateConnectionRequestType, MysqlOptionsType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import locales from '@/locales';
import { Box, Button, Checkbox, FormControlLabel, Stack } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { toast } from 'sonner';
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
import ConnectionModeSwitch from '../ConnectionModeSwitch';
import ConnectionUriInput from '../ConnectionUriInput';
import ConnectionSSHFields from '../ConnectionSSHFields';
import ConnectionTLSFields from '../ConnectionTLSFields';
import { parseConnectionUri, URI_PLACEHOLDER } from '../connectionUri';
import { applyParsedConnectionUri, copyRedactedUri, switchUriMode, syncFromUri } from '../connectionUriForm';
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

const baseShape = {
  isPing: v.boolean(),
  rememberPassword: v.boolean(),
  name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
  env: v.picklist(['', 'dev', 'uat', 'prod']),
  username: v.string(),
  password: v.string(),
  database: v.string(),
  sslMode: v.string(),
  ssh: sshFormSchema
};

// In connection-string mode the host and port come from the string, so only the string is required.
const formSchema = v.union([
  v.object({
    ...baseShape,
    useUri: v.literal(true),
    uri: v.pipe(
      v.string(),
      v.check((input) => input.trim() !== '', 'At least 1 character')
    ),
    host: v.string(),
    port: v.string()
  }),
  v.object({
    ...baseShape,
    useUri: v.literal(false),
    uri: v.string(),
    host: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
    port: number(1, 65535)
  })
]);

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
  const dialect = connectionType === 'clickhouse' ? 'clickhouse' : 'sqlserver';

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
          ssl: { mode: value.sslMode },
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
      useUri: false,
      uri: '',
      isPing: false,
      rememberPassword: false,
      name: connection?.name ?? '',
      env: connection?.env ?? '',
      host: options?.host ?? '',
      port: options?.port?.toString() ?? defaults.port,
      username: options?.username ?? defaults.username,
      password: '',
      database: options?.database ?? '',
      sslMode: options?.ssl?.mode || 'disable',
      ssh: sshFormDefaults(options?.ssh)
    }
  });

  const changeMode = (toUri: boolean): void => {
    switchUriMode(form, dialect, toUri);
    form.setFieldValue('useUri', toUri);
  };

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

  const check = (name: 'rememberPassword', label: string): JSX.Element => (
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
              <form.Subscribe selector={(state) => state.values.useUri}>
                {(useUri): JSX.Element => (
                  <>
                    <ConnectionFormSection title={locales.connection_section_server}>
                      <ConnectionModeSwitch value={useUri ? 'uri' : 'manual'} onChange={(mode): void => changeMode(mode === 'uri')} />
                      {useUri ? (
                        <form.Field name='uri'>
                          {(field): JSX.Element => (
                            <ConnectionUriInput
                              value={field.state.value}
                              errors={field.state.meta.errors}
                              placeholder={URI_PLACEHOLDER[dialect]}
                              onChange={(value): void => {
                                field.handleChange(value);
                                const parsed = parseConnectionUri(value, dialect);
                                if (parsed) {
                                  applyParsedConnectionUri(form, parsed);
                                }
                              }}
                              onBlur={(): void => {
                                if (
                                  field.state.value.trim() &&
                                  !syncFromUri(form, dialect, field.state.value, { redact: true, warn: true })
                                ) {
                                  toast.error(locales.uri_invalid);
                                }
                              }}
                              onCopy={(): void => void copyRedactedUri(form, dialect)}
                            />
                          )}
                        </form.Field>
                      ) : (
                        <>
                          <ConnectionFormRowStyled hostPort>
                            {text('host', locales.host, { placeholder: 'localhost' })}
                            {text('port', locales.port, { placeholder: defaults.port, type: 'number' })}
                          </ConnectionFormRowStyled>
                          {text('database', locales.database)}
                        </>
                      )}
                    </ConnectionFormSection>
              <ConnectionFormSection title={locales.connection_section_auth}>
                <ConnectionFormRowStyled>
                  {!useUri && text('username', locales.username)}
                  {text('password', locales.password, { type: 'password' })}
                </ConnectionFormRowStyled>
                <ConnectionFormCheckboxRowStyled>
                  {check('rememberPassword', locales.remember_password)}
                </ConnectionFormCheckboxRowStyled>
              </ConnectionFormSection>
                  </>
                )}
              </form.Subscribe>
            </>
          }
          ssl={
            <form.Subscribe selector={(state) => state.values.sslMode}>
              {(sslMode): JSX.Element => (
                <ConnectionTLSFields
                  enabled={sslMode !== 'disable'}
                  onEnabledChange={(next): void => form.setFieldValue('sslMode', next ? 'require' : 'disable')}
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
