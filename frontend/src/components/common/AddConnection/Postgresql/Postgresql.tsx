import type { CreateConnectionRequestType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button, Checkbox, Stack, Typography } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { type JSX, useState } from 'react';
import * as v from 'valibot';

import type { ConnectionSettingsProps } from '../types';

const formSchema = v.object({
  isPing: v.boolean(),
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
});

export default function PostgreSQL({
  connection,
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const [useUri, setUseUri] = useState(false);

  const form = useForm({
    validators: {
      //@ts-ignore
      onSubmit: formSchema
    },
    onSubmit: async ({ value }): Promise<void> => {
      const data = {
        name: value.name,
        type: 'postgresql',
        options: {
          ...value,
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
      isPing: false,
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
    <Box flex={1} display={'flex'} flexDirection={'column'}>
      <Box flex={1}>
        <form
          onSubmit={(e): void => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit().then();
          }}
        >
          <form.Field name='name'>
            {(field): JSX.Element => (
              <Box>
                <FieldInput
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
          <Stack direction='row' spacing={2}>
            <form.Field name='host'>
              {(field): JSX.Element => (
                <Box>
                  <FieldInput
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

          <Box display={'flex'} flexDirection={'column'}>
            <Box display={'flex'} alignItems={'center'}>
              <Checkbox checked={useUri} size={'small'} onChange={(e): void => setUseUri(e.target.checked)} />
              <Typography fontSize={'13px'} color='textText'>
                {locales.use_uri}
              </Typography>
            </Box>

            <form.Field name='uri'>
              {(field): JSX.Element => (
                <>
                  <FieldInput
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    label={locales.uri}
                    onChange={(e): void => field.handleChange(e.target.value)}
                    disabled={!useUri}
                  />
                  <FormError mb={1} errors={field.state.meta.errors} />
                </>
              )}
            </form.Field>
          </Box>
        </form>
      </Box>

      <Box display={'flex'} mt={2} justifyContent={'space-between'}>
        <Button size='small' onClick={onClose}>
          {locales.cancel}
        </Button>
        <Stack spacing={1} direction={'row'}>
          <Button
            loadingPosition='start'
            disabled={pingLoading}
            loading={pingLoading}
            onClick={(): void => {
              form.state.values.isPing = true;
              form.handleSubmit().then();
            }}
            size='small'
            variant='contained'
            color='secondary'
          >
            <span>{locales.test}</span>
          </Button>
          <Button
            loadingPosition='start'
            disabled={submitLoading}
            loading={submitLoading}
            onClick={(): void => {
              form.state.values.isPing = false;
              form.handleSubmit().then();
            }}
            size='small'
            variant='contained'
          >
            <span>{connection ? locales.update : locales.create}</span>
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
