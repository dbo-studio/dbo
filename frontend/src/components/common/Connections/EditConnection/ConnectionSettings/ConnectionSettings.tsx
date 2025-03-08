import api from '@/api';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { LoadingButton } from '@mui/lab';
import { Box, Button, Stack } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { z } from 'zod';
import FieldInput from '../../../../base/FieldInput/FieldInput';
import type { ConnectionSettingsProps } from '../types';

const formSchema = z.object({
  isTest: z.boolean().optional(),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z
    .string()
    .min(1)
    .refine((val) => !Number.isNaN(Number.parseInt(val, 10)), {
      message: 'Expected number, received a string'
    }),
  username: z.string().min(1),
  password: z.string().optional(),
  database: z.string().optional()
});

export default function ConnectionSetting({ connection, onClose }: ConnectionSettingsProps) {
  const { updateSelectedTab, updateTabs } = useTabStore();
  const { updateCurrentConnection } = useConnectionStore();

  const { request: updateConnection, pending: updateConnectionPending } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  const { request: testConnection, pending: testConnectionPending } = useAPI({
    apiMethod: api.connection.testConnection
  });

  const form = useForm({
    validators: {
      onChange: formSchema
    },
    onSubmit: async ({ value }) => {
      //test connection ping
      if (value.isTest) {
        if (testConnectionPending) {
          return;
        }
        try {
          await testConnection(value);
          toast.success(locales.connection_test_success);
        } catch (err) {
          if (isAxiosError(err)) {
            toast.error(err.message);
          }
          console.log('🚀 ~ ConnectionSettings.tsx: ~ err:', err);
        }
        return;
      }

      //update connection
      if (updateConnectionPending) {
        return;
      }
      try {
        const res = await updateConnection({
          ...value,
          id: connection?.id
        });
        toast.success(locales.connection_update_success);
        updateSelectedTab(undefined);
        updateTabs([]);
        updateCurrentConnection(res);
        onClose();
      } catch (err) {
        if (isAxiosError(err)) {
          toast.error(err.message);
        }
        console.log('🚀 ~ ConnectionSettings.tsx: ~ err:', err);
      }
    },
    defaultValues: {
      isTest: false,
      database: connection?.auth.database,
      host: connection?.auth.host ?? '',
      port: connection?.auth.port.toString() ?? '',
      name: connection?.name ?? '',
      username: connection?.auth.username ?? '',
      password: ''
    }
  });

  return (
    connection && (
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
                <FieldInput
                  value={field.state.value}
                  helpertext={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                  error={field.state.meta.errors.length > 0}
                  fullWidth={true}
                  label={locales.name}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </form.Field>

            <Stack direction='row' spacing={2}>
              <form.Field name='host'>
                {(field) => (
                  <FieldInput
                    value={field.state.value}
                    helpertext={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                    error={field.state.meta.errors.length > 0}
                    label={locales.host}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>

              <form.Field name='port'>
                {(field) => (
                  <FieldInput
                    value={field.state.value}
                    helpertext={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                    error={field.state.meta.errors.length > 0}
                    label={locales.port}
                    type='number'
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
            </Stack>
            <Stack direction='row' spacing={2}>
              <form.Field name='username'>
                {(field) => (
                  <FieldInput
                    value={field.state.value}
                    helpertext={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                    error={field.state.meta.errors.length > 0}
                    label={locales.username}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>

              <form.Field name='password'>
                {(field) => (
                  <FieldInput
                    value={field.state.value}
                    helpertext={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                    error={field.state.meta.errors.length > 0}
                    label={locales.password}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
            </Stack>
            <form.Field name='database'>
              {(field) => (
                <FieldInput
                  value={field.state.value}
                  helpertext={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                  error={field.state.meta.errors.length > 0}
                  label={locales.database}
                  fullWidth={true}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </form.Field>
          </form>
        </Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <Button size='small' onClick={onClose}>
            {locales.cancel}
          </Button>
          <Stack spacing={1} direction={'row'}>
            <LoadingButton
              loading={testConnectionPending}
              onClick={() => {
                form.state.values.isTest = true;
                form.handleSubmit().then();
              }}
              size='small'
              variant='contained'
              color='secondary'
            >
              <span> {locales.test}</span>
            </LoadingButton>
            <LoadingButton
              loading={updateConnectionPending}
              onClick={() => {
                form.state.values.isTest = false;
                form.handleSubmit().then();
              }}
              size='small'
              variant='contained'
            >
              <span> {locales.update}</span>
            </LoadingButton>
          </Stack>
        </Box>
      </Box>
    )
  );
}
