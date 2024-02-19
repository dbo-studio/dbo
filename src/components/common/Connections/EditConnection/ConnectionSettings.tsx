import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import locales from '@/src/locales';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Stack } from '@mui/material';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import FieldInput from '../../../base/FieldInput/FieldInput';
import { ConnectionSettingsProps } from './types';

interface IFormInput {
  name: string;
  host: string;
  port: string;
  username: string;
  password?: string;
  database?: string;
}

const formSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z
    .string()
    .min(1)
    .refine((val) => !Number.isNaN(parseInt(val, 10)), {
      message: 'Expected number, received a string'
    }),
  username: z.string().min(1),
  password: z.string().optional(),
  database: z.string().optional()
});

type ValidationSchema = z.infer<typeof formSchema>;

export default function ConnectionSetting({ connection, onClose }: ConnectionSettingsProps) {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ValidationSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      database: connection?.auth.database,
      host: connection?.auth.host ?? '',
      port: connection?.auth.port + '' ?? '',
      name: connection?.name ?? '',
      username: connection?.auth.username ?? '',
      password: ''
    }
  });

  const { request: updateConnection } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  const { request: testConnection } = useAPI({
    apiMethod: api.connection.testConnection
  });

  const onSubmit: SubmitHandler<IFormInput> = async (data, e) => {
    e?.preventDefault();
    try {
      //todo: add loading
      await updateConnection({
        ...data,
        id: connection?.id
      });
      toast.success(locales.connection_update_success);
      onClose();
    } catch (err) {
      console.log(err);
    }
  };

  const handleTestConnection: SubmitHandler<IFormInput> = async (data, e) => {
    e?.preventDefault();
    try {
      await testConnection(data);
      toast.success(locales.connection_test_success);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    connection && (
      <Box flex={1} display={'flex'} flexDirection={'column'}>
        <Box flex={1}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name='name'
              control={control}
              render={({ field }) => (
                <FieldInput
                  helperText={errors.name?.message}
                  error={!!errors.name}
                  fullWidth={true}
                  label={locales.name}
                  {...field}
                />
              )}
            />
            <Stack direction='row' spacing={2}>
              <Controller
                name='host'
                control={control}
                render={({ field }) => (
                  <FieldInput helperText={errors.host?.message} error={!!errors.host} label={locales.host} {...field} />
                )}
              />
              <Controller
                name='port'
                control={control}
                render={({ field }) => (
                  <FieldInput
                    helperText={errors.port?.message}
                    error={!!errors.port}
                    label={locales.port}
                    type='number'
                    {...field}
                  />
                )}
              />
            </Stack>
            <Stack direction='row' spacing={2}>
              <Controller
                name='username'
                control={control}
                render={({ field }) => (
                  <FieldInput
                    helperText={errors.username?.message}
                    error={!!errors.username}
                    label={locales.username}
                    {...field}
                  />
                )}
              />
              <Controller
                name='password'
                control={control}
                render={({ field }) => (
                  <FieldInput
                    helperText={errors.password?.message}
                    error={!!errors.password}
                    label={locales.password}
                    {...field}
                  />
                )}
              />
            </Stack>
            <Controller
              name='database'
              control={control}
              render={({ field }) => (
                <FieldInput
                  helperText={errors.database?.message}
                  error={!!errors.database}
                  fullWidth={true}
                  label={locales.database}
                  {...field}
                />
              )}
            />
          </form>
        </Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <Button size='small' onClick={onClose}>
            {locales.cancel}
          </Button>
          <Stack spacing={1} direction={'row'}>
            <Button onClick={handleSubmit(handleTestConnection)} size='small' variant='contained' color='secondary'>
              {locales.test}
            </Button>
            <Button onClick={handleSubmit(onSubmit)} size='small' variant='contained'>
              {locales.update}
            </Button>
          </Stack>
        </Box>
      </Box>
    )
  );
}
