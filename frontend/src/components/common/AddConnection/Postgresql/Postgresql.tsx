import type { CreateConnectionRequestType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button, Checkbox, FormControlLabel, Stack } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import * as v from 'valibot';

import type { ConnectionSettingsProps } from '../types';
import {
  ConnectionFormBodyStyled,
  ConnectionFormCheckboxRowStyled,
  ConnectionFormContainerStyled,
  ConnectionFormFooterStyled
} from '../AddConnection.styled';

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
    uri: v.pipe(v.string(), v.minLength(1, 'At least 1 character'))
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
    uri: v.string()
  })
]);

export default function PostgreSQL({
  connection,
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const form = useForm({
    validators: {
      onSubmit: formSchema
    },
    onSubmit: ({ value }): void => {
      const data = {
        name: value.name,
        type: 'postgresql',
        rememberPassword: value.rememberPassword,
        options: {
          host: value.host,
          username: value.username,
          password: value.password,
          database: value.database,
          uri: value.uri,
          port: Number(value.port)
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
      useUri: Boolean(connection?.options.uri),
      isPing: false,
      rememberPassword: false,
      name: connection?.name ?? '',
      host: connection?.options.host ?? '',
      port: connection?.options.port.toString() ?? '',
      username: connection?.options.username ?? '',
      password: '',
      database: connection?.options.database ?? '',
      uri: connection?.options.uri ?? ''
    }
  });

  return (
    <ConnectionFormContainerStyled>
      <ConnectionFormBodyStyled>
        <form
          onSubmit={(e): void => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
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
                <Stack direction='row' spacing={2}>
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
                          placeholder={'5432'}
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
                </Stack>
                <Stack direction='row' spacing={2}>
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
                          disabled={useUri}
                          value={field.state.value}
                          error={field.state.meta.errors.length > 0}
                          label={locales.password}
                          onChange={(e): void => field.handleChange(e.target.value)}
                        />
                        <FormError mb={1} errors={field.state.meta.errors} />
                      </Box>
                    )}
                  </form.Field>
                </Stack>

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
                        onChange={(e): void => field.handleChange(e.target.checked)}
                      />
                    }
                    label={locales.use_uri}
                  />
                )}
              </form.Field>
            </ConnectionFormCheckboxRowStyled>

            <form.Subscribe selector={(state) => state.values.useUri}>
              {(useUri): JSX.Element => (
                <form.Field name='uri'>
                  {(field): JSX.Element => (
                    <>
                      <FieldInput
                        name='uri'
                        value={field.state.value}
                        error={field.state.meta.errors.length > 0}
                        label={locales.uri}
                        onChange={(e): void => field.handleChange(e.target.value)}
                        disabled={!useUri}
                        placeholder='postgres://username:password@hostname:port/dbname'
                      />
                      <FormError mb={1} errors={field.state.meta.errors} />
                    </>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
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
        </form>
      </ConnectionFormBodyStyled>
      <ConnectionFormFooterStyled>
        <Button size='small' onClick={onClose}>
          {locales.cancel}
        </Button>
        <Stack spacing={1} direction={'row'}>
          <Button
            data-testid='test-connection'
            loadingPosition='start'
            loading={pingLoading}
            onClick={(): void => {
              form.state.values.isPing = true;
              void form.handleSubmit();
            }}
            size='small'
            variant='contained'
            color='secondary'
          >
            {locales.test}
          </Button>
          <Button
            data-testid='create-connection'
            loadingPosition='start'
            loading={submitLoading}
            onClick={(): void => {
              form.state.values.isPing = false;
              void form.handleSubmit();
            }}
            size='small'
            variant='contained'
          >
            {connection ? locales.update : locales.create}
          </Button>
        </Stack>
      </ConnectionFormFooterStyled>
    </ConnectionFormContainerStyled>
  );
}
