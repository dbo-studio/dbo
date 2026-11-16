import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import type { CreateConnectionRequestType, MysqlOptionsType, PostgresqlOptionsType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
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
} from './AddConnection.styled';
import ConnectionEnvField from './ConnectionEnvField';
import ConnectionFormSection from './ConnectionFormSection';
import ConnectionModeSwitch from './ConnectionModeSwitch';
import ConnectionFormTabs from './ConnectionFormTabs';
import ConnectionSSHFields from './ConnectionSSHFields';
import ConnectionSSLFields from './ConnectionSSLFields';
import { DEFAULT_PORTS, parseConnectionUri, URI_PLACEHOLDER } from './connectionUri';
import { applyParsedConnectionUri, copyRedactedUri, switchUriMode, syncFromUri } from './connectionUriForm';
import ConnectionUriInput from './ConnectionUriInput';
import { sshFormDefaults, sshFormSchema, sshOptionsFromForm } from './ssh';
import { sslFormDefaults, sslOptionsFromForm } from './ssl';
import type { ConnectionSettingsProps } from './types';

type UriDialect = 'postgresql' | 'mysql';

const formSchema = v.union([
  v.object({
    useUri: v.literal(true),
    isPing: v.boolean(),
    rememberPassword: v.boolean(),
    name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
    env: v.picklist(['', 'dev', 'uat', 'prod']),
    host: v.string(),
    port: v.string(),
    username: v.string(),
    password: v.string(),
    database: v.string(),
    uri: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
    sslMode: v.string(),
    sslCaCert: v.string(),
    sslClientCert: v.string(),
    sslClientKey: v.string(),
    ssh: sshFormSchema
  }),
  v.object({
    useUri: v.literal(false),
    isPing: v.boolean(),
    rememberPassword: v.boolean(),
    name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
    env: v.picklist(['', 'dev', 'uat', 'prod']),
    host: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
    port: v.pipe(
      v.string(),
      v.check((input) => !Number.isNaN(Number.parseInt(input, 10)), 'Expected number, received a string')
    ),
    username: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
    password: v.string(),
    database: v.string(),
    uri: v.string(),
    sslMode: v.string(),
    sslCaCert: v.string(),
    sslClientCert: v.string(),
    sslClientKey: v.string(),
    ssh: sshFormSchema
  })
]);

export default function UriSqlForm({
  dialect,
  connection,
  submitLabel,
  engine = dialect,
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps & { dialect: UriDialect }): JSX.Element {
  const options = connection?.options as PostgresqlOptionsType | MysqlOptionsType | undefined;
  const sslDefaults = sslFormDefaults(options?.ssl);
  const connectionType = connection?.type ?? engine;
  const sourceUri = options?.uri;
  const parsedUri = sourceUri ? parseConnectionUri(sourceUri, dialect) : null;

  const form = useForm({
    validators: {
      onSubmit: formSchema
    },
    onSubmit: ({ value }): void => {
      const data = {
        name: value.name,
        type: connectionType,
        rememberPassword: value.rememberPassword,
        env: value.env,
        options: {
          host: value.host,
          username: value.username,
          password: value.password,
          database: value.database,
          uri: value.useUri ? value.uri : '',
          port: Number(value.port || 0),
          ssl: sslOptionsFromForm(value),
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
      useUri: Boolean(options?.uri),
      isPing: false,
      rememberPassword: false,
      env: connection?.env ?? '',
      name: connection?.name ?? '',
      host: options?.host || parsedUri?.host || '',
      // A new connection starts on the engine's usual port, which the field shows as its placeholder.
      port: options?.port?.toString() || parsedUri?.port || DEFAULT_PORTS[dialect],
      username: options?.username || parsedUri?.username || '',
      password: '',
      database: options?.database || parsedUri?.database || '',
      uri: parsedUri?.redactedUri ?? options?.uri ?? '',
      ...sslDefaults,
      ssh: sshFormDefaults(options?.ssh),
      sslMode: options?.ssl?.mode || parsedUri?.sslMode || sslDefaults.sslMode
    }
  });

  const changeMode = (toUri: boolean): void => {
    switchUriMode(form, dialect, toUri);
    form.setFieldValue('useUri', toUri);
  };

  return (
    <ConnectionFormContainerStyled
      component='form'
      onSubmit={(e): void => {
        e.preventDefault();
        e.stopPropagation();
        form.state.values.isPing = false;
        void form.handleSubmit();
      }}
    >
      <ConnectionFormBodyStyled>
        <ConnectionFormTabs
          general={
            <>
              <form.Field name='name'>
                {(field): JSX.Element => (
                  <Box>
                    <FieldInput
                      name='name'
                      value={field.state.value}
                      error={field.state.meta.errors.length > 0}
                      fullWidth={true}
                      label={locales.name}
                      onChange={(e): void => field.handleChange(e.target.value)}
                    />
                    <FormError mb={1} errors={field.state.meta.errors} />
                  </Box>
                )}
              </form.Field>
              <form.Field name='env'>
                {(field): JSX.Element => (
                  <ConnectionEnvField value={field.state.value} onChange={(next): void => field.handleChange(next)} />
                )}
              </form.Field>
              <form.Subscribe selector={(state) => state.values.useUri}>
                {(useUri): JSX.Element => (
                  <>
                    <ConnectionFormSection title={locales.connection_section_server}>
                      <ConnectionModeSwitch
                        value={useUri ? 'uri' : 'manual'}
                        onChange={(mode): void => changeMode(mode === 'uri')}
                      />
                      {useUri ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <ConnectionFormRowStyled hostPort>
                            <form.Field name='host'>
                              {(field): JSX.Element => (
                                <Box>
                                  <FieldInput
                                    name='host'
                                    placeholder='localhost'
                                    value={field.state.value}
                                    error={field.state.meta.errors.length > 0}
                                    label={locales.host}
                                    onChange={(e): void => field.handleChange(e.target.value)}
                                  />
                                  <FormError mb={1} errors={field.state.meta.errors} />
                                </Box>
                              )}
                            </form.Field>

                            <form.Field name='port'>
                              {(field): JSX.Element => (
                                <Box>
                                  <FieldInput
                                    name='port'
                                    placeholder={DEFAULT_PORTS[dialect]}
                                    value={field.state.value}
                                    error={field.state.meta.errors.length > 0}
                                    label={locales.port}
                                    type='number'
                                    onChange={(e): void => field.handleChange(e.target.value)}
                                  />
                                  <FormError mb={1} errors={field.state.meta.errors} />
                                </Box>
                              )}
                            </form.Field>
                          </ConnectionFormRowStyled>
                          <form.Field name='database'>
                            {(field): JSX.Element => (
                              <>
                                <FieldInput
                                  name='database'
                                  disabled={useUri}
                                  value={field.state.value}
                                  error={field.state.meta.errors.length > 0}
                                  label={locales.database}
                                  fullWidth={true}
                                  onChange={(e): void => field.handleChange(e.target.value)}
                                />
                                <FormError mb={1} errors={field.state.meta.errors} />
                              </>
                            )}
                          </form.Field>
                        </>
                      )}
                    </ConnectionFormSection>
                    <ConnectionFormSection title={locales.connection_section_auth}>
                      <ConnectionFormRowStyled>
                        {!useUri && (
                          <form.Field name='username'>
                            {(field): JSX.Element => (
                              <Box>
                                <FieldInput
                                  mb={1}
                                  name='username'
                                  value={field.state.value}
                                  error={field.state.meta.errors.length > 0}
                                  label={locales.username}
                                  onChange={(e): void => field.handleChange(e.target.value)}
                                />
                                <FormError mb={1} errors={field.state.meta.errors} />
                              </Box>
                            )}
                          </form.Field>
                        )}

                        <form.Field name='password'>
                          {(field): JSX.Element => (
                            <Box>
                              <FieldInput
                                name='password'
                                type='password'
                                value={field.state.value}
                                error={field.state.meta.errors.length > 0}
                                label={locales.password}
                                onChange={(e): void => field.handleChange(e.target.value)}
                              />
                              <FormError mb={1} errors={field.state.meta.errors} />
                            </Box>
                          )}
                        </form.Field>
                      </ConnectionFormRowStyled>

                      <ConnectionFormCheckboxRowStyled>
                        <form.Field name='rememberPassword'>
                          {(field): JSX.Element => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={field.state.value}
                                  size={'small'}
                                  onChange={(e): void => field.handleChange(e.target.checked)}
                                />
                              }
                              label={locales.remember_password}
                            />
                          )}
                        </form.Field>
                      </ConnectionFormCheckboxRowStyled>
                    </ConnectionFormSection>
                  </>
                )}
              </form.Subscribe>
            </>
          }
          ssh={
            <form.Subscribe selector={(state) => state.values.ssh}>
              {(ssh): JSX.Element => (
                <ConnectionSSHFields value={ssh} onChange={(next): void => form.setFieldValue('ssh', next)} />
              )}
            </form.Subscribe>
          }
          ssl={
            <form.Subscribe
              selector={(state) => ({
                sslMode: state.values.sslMode,
                sslCaCert: state.values.sslCaCert,
                sslClientCert: state.values.sslClientCert,
                sslClientKey: state.values.sslClientKey
              })}
            >
              {(ssl): JSX.Element => (
                <ConnectionSSLFields
                  engine={dialect}
                  mode={ssl.sslMode}
                  caCert={ssl.sslCaCert}
                  clientCert={ssl.sslClientCert}
                  clientKey={ssl.sslClientKey}
                  onModeChange={(mode): void => form.setFieldValue('sslMode', mode)}
                  onCaCertChange={(value): void => form.setFieldValue('sslCaCert', value)}
                  onClientCertChange={(value): void => form.setFieldValue('sslClientCert', value)}
                  onClientKeyChange={(value): void => form.setFieldValue('sslClientKey', value)}
                />
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
          loading={pingLoading}
          onClick={(): void => {
            form.state.values.isPing = true;
            void form.handleSubmit();
          }}
          variant='outlined'
        >
          {locales.test}
        </Button>
        <Stack spacing={1} direction={'row'}>
          <Button type='button' onClick={onClose}>
            {locales.cancel}
          </Button>
          <Button
            type='submit'
            data-testid='create-connection'
            loadingPosition='start'
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
