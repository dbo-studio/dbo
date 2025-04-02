import type { CreateConnectionRequestType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { LoadingButton } from '@mui/lab';
import { Box, Button, Checkbox, Stack, Typography } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { z } from 'zod';
import type { ConnectionSettingsProps } from '../types';

const formSchema = z.object({
  isPing: z.boolean().optional(),
  name: z.string().min(1, 'At least 1 character'),
  host: z.string().min(1, 'At least 1 character'),
  port: z.string().refine((val) => !Number.isNaN(Number.parseInt(val, 10)), {
    message: 'Expected number, received a string'
  }),
  username: z.string().min(1, 'At least 1 character'),
  password: z.string().optional(),
  database: z.string().optional(),
  uri: z.string().optional()
});

export default function PostgreSQL({
  connection,
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps) {
  const [useUri, setUseUri] = useState(false);

  const form = useForm({
    validators: {
      //@ts-ignore
      onSubmit: formSchema
    },
    onSubmit: async ({ value }) => {
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
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit().then();
          }}
        >
          <form.Field name='name'>
            {(field) => (
              <Box>
                <FieldInput
                  value={field.state.value}
                  error={field.state.meta.errors.length > 0}
                  fullWidth={true}
                  label={locales.name}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FormError mb={1} errors={field.state.meta.errors} />
              </Box>
            )}
          </form.Field>
          <Stack direction='row' spacing={2}>
            <form.Field name='host'>
              {(field) => (
                <Box>
                  <FieldInput
                    placeholder='localhost'
                    disabled={useUri}
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    label={locales.host}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FormError mb={1} errors={field.state.meta.errors} />
                </Box>
              )}
            </form.Field>

            <form.Field name='port'>
              {(field) => (
                <Box>
                  <FieldInput
                    disabled={useUri}
                    placeholder={'5432'}
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    label={locales.port}
                    type='number'
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FormError mb={1} errors={field.state.meta.errors} />
                </Box>
              )}
            </form.Field>
          </Stack>
          <Stack direction='row' spacing={2}>
            <form.Field name='username'>
              {(field) => (
                <Box>
                  <FieldInput
                    mb={1}
                    disabled={useUri}
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    label={locales.username}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FormError mb={1} errors={field.state.meta.errors} />
                </Box>
              )}
            </form.Field>

            <form.Field name='password'>
              {(field) => (
                <Box>
                  <FieldInput
                    disabled={useUri}
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    label={locales.password}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FormError mb={1} errors={field.state.meta.errors} />
                </Box>
              )}
            </form.Field>
          </Stack>

          <form.Field name='database'>
            {(field) => (
              <>
                <FieldInput
                  disabled={useUri}
                  value={field.state.value}
                  error={field.state.meta.errors.length > 0}
                  label={locales.database}
                  fullWidth={true}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FormError mb={1} errors={field.state.meta.errors} />
              </>
            )}
          </form.Field>

          <Box display={'flex'} flexDirection={'column'}>
            <Box display={'flex'} alignItems={'center'}>
              <Checkbox checked={useUri} size={'small'} onChange={(e) => setUseUri(e.target.checked)} />
              <Typography fontSize={'13px'} color='textText'>
                {locales.use_uri}
              </Typography>
            </Box>

            <form.Field name='uri'>
              {(field) => (
                <>
                  <FieldInput
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    label={locales.uri}
                    onChange={(e) => field.handleChange(e.target.value)}
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
          <LoadingButton
            disabled={pingLoading}
            loading={pingLoading}
            onClick={() => {
              form.state.values.isPing = true;
              form.handleSubmit().then();
            }}
            size='small'
            variant='contained'
            color='secondary'
          >
            <span>{locales.test}</span>
          </LoadingButton>
          <LoadingButton
            disabled={submitLoading}
            loading={submitLoading}
            onClick={() => {
              form.state.values.isPing = false;
              form.handleSubmit().then();
            }}
            size='small'
            variant='contained'
          >
            <span>{connection ? locales.update : locales.create}</span>
          </LoadingButton>
        </Stack>
      </Box>
    </Box>
  );
}
