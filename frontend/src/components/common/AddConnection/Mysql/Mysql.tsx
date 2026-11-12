import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import type { CreateConnectionRequestType, MysqlOptionsType } from '@/api/connection/types';
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
} from '../AddConnection.styled';
import ConnectionFormTabs from '../ConnectionFormTabs';
import ConnectionSSHFields from '../ConnectionSSHFields';
import ConnectionSSLFields from '../ConnectionSSLFields';
import { buildConnectionUri, DEFAULT_PORTS, parseConnectionUri } from '../connectionUri';
import { applyParsedConnectionUri } from '../connectionUriForm';
import { sshFormDefaults, sshFormSchema, sshOptionsFromForm } from '../ssh';
import { sslFormDefaults, sslOptionsFromForm } from '../ssl';
import type { ConnectionSettingsProps } from '../types';

const formSchema = v.union([
  v.object({
    useUri: v.literal(true),
    isPing: v.boolean(),
    rememberPassword: v.boolean(),
    name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
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

export default function Mysql({
  connection,
  submitLabel,
  engine = 'mysql',
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const options = connection?.options as MysqlOptionsType | undefined;
  const sslDefaults = sslFormDefaults(options?.ssl);
  const connectionType = connection?.type ?? engine;
  const parsedUri = options?.uri ? parseConnectionUri(options.uri, 'mysql') : null;

  const form = useForm({
    validators: {
      onSubmit: formSchema
    },
    onSubmit: ({ value }): void => {
      const data = {
        name: value.name,
        type: connectionType,
        rememberPassword: value.rememberPassword,
        options: {
          host: value.host,
          port: Number(value.port || 0),
          username: value.username,
          password: value.password,
          database: value.database,
          uri: value.useUri ? value.uri : '',
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
      name: connection?.name ?? '',
      host: options?.host || parsedUri?.host || '',
      // A new connection starts on the engine's usual port, which the field shows as its placeholder.
      port: options?.port?.toString() || parsedUri?.port || DEFAULT_PORTS.mysql,
      username: options?.username || parsedUri?.username || '',
      password: '',
      database: options?.database || parsedUri?.database || '',
      uri: parsedUri?.redactedUri ?? options?.uri ?? '',
      ...sslDefaults,
      ssh: sshFormDefaults(options?.ssh),
      sslMode: options?.ssl?.mode || parsedUri?.sslMode || sslDefaults.sslMode
    }
  });

  const syncFromUri = (raw: string, opts?: { redact?: boolean; warn?: boolean }): boolean => {
    const parsed = parseConnectionUri(raw, 'mysql');
    if (!parsed) {
      return false;
    }

    applyParsedConnectionUri(form, parsed);
    if (opts?.redact) {
      form.setFieldValue('uri', parsed.redactedUri);
    }

    if (opts?.warn && parsed.lossy) {
      toast.warning(locales.uri_sync_lossy);
    }

    return true;
  };

  const copyRedactedUri = async (): Promise<void> => {
    const values = form.state.values;
    const uri =
      values.uri ||
      buildConnectionUri(
        {
          host: values.host,
          port: values.port,
          username: values.username,
          password: values.password,
          database: values.database,
          sslMode: values.sslMode
        },
        'mysql',
        { redact: true }
      );
    const parsed = parseConnectionUri(uri, 'mysql');
    const redacted =
      parsed?.redactedUri ??
      buildConnectionUri(
        {
          host: values.host,
          port: values.port,
          username: values.username,
          password: '',
          database: values.database,
          sslMode: values.sslMode
        },
        'mysql',
        { redact: true }
      );

    await navigator.clipboard.writeText(redacted);
    toast.success(locales.uri_copied);
  };

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
          generalLabel={locales.general}
          sslLabel={locales.ssl}
          sshLabel={locales.ssh}
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
              <form.Subscribe selector={(state) => state.values.useUri}>
                {(useUri): JSX.Element => (
                  <>
                    <ConnectionFormRowStyled>
                      <form.Field name='host'>
                        {(field): JSX.Element => (
                          <Box>
                            <FieldInput
                              name='host'
                              placeholder='localhost'
                              disabled={useUri}
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
                              disabled={useUri}
                              placeholder={'3306'}
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
                    <ConnectionFormRowStyled>
                      <form.Field name='username'>
                        {(field): JSX.Element => (
                          <Box>
                            <FieldInput
                              mb={1}
                              name='username'
                              disabled={useUri}
                              value={field.state.value}
                              error={field.state.meta.errors.length > 0}
                              label={locales.username}
                              onChange={(e): void => field.handleChange(e.target.value)}
                            />
                            <FormError mb={1} errors={field.state.meta.errors} />
                          </Box>
                        )}
                      </form.Field>

                      <form.Field name='password'>
                        {(field): JSX.Element => (
                          <Box>
                            <FieldInput
                              name='password'
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
              </form.Subscribe>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <ConnectionFormCheckboxRowStyled>
                  <form.Field name='useUri'>
                    {(field): JSX.Element => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={field.state.value}
                            size={'small'}
                            onChange={(e): void => {
                              const next = e.target.checked;
                              const values = form.state.values;
                              if (next) {
                                if (values.uri.trim()) {
                                  if (!syncFromUri(values.uri, { redact: true, warn: true })) {
                                    toast.error(locales.uri_invalid);
                                  }
                                } else {
                                  form.setFieldValue(
                                    'uri',
                                    buildConnectionUri(
                                      {
                                        host: values.host,
                                        port: values.port,
                                        username: values.username,
                                        password: values.password,
                                        database: values.database,
                                        sslMode: values.sslMode
                                      },
                                      'mysql',
                                      { redact: true }
                                    )
                                  );
                                }
                              } else if (values.uri.trim()) {
                                syncFromUri(values.uri, { redact: true, warn: true });
                              }

                              field.handleChange(next);
                            }}
                          />
                        }
                        label={locales.use_uri}
                      />
                    )}
                  </form.Field>
                  <Button
                    data-testid='copy-connection-uri'
                    onClick={(): void => {
                      void copyRedactedUri();
                    }}
                  >
                    {locales.copy_uri}
                  </Button>
                </ConnectionFormCheckboxRowStyled>

                <form.Field name='uri'>
                  {(field): JSX.Element => (
                    <form.Subscribe selector={(state) => state.values.useUri}>
                      {(useUri): JSX.Element => (
                        <>
                          <FieldInput
                            name='uri'
                            value={field.state.value}
                            error={field.state.meta.errors.length > 0}
                            label={locales.uri}
                            onChange={(e): void => {
                              const value = e.target.value;
                              field.handleChange(value);
                              const parsed = parseConnectionUri(value, 'mysql');
                              if (parsed) {
                                applyParsedConnectionUri(form, parsed);
                              }
                            }}
                            onBlur={(): void => {
                              if (!field.state.value.trim()) {
                                return;
                              }

                              if (!syncFromUri(field.state.value, { redact: true, warn: true })) {
                                toast.error(locales.uri_invalid);
                              }
                            }}
                            disabled={!useUri}
                            placeholder='mysql://username:password@hostname:port/dbname'
                          />
                          <FormError mb={1} errors={field.state.meta.errors} />
                        </>
                      )}
                    </form.Subscribe>
                  )}
                </form.Field>
              </Box>

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
                  engine='mysql'
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
        <Stack spacing={1} direction={'row'}>
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
