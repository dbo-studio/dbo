import type { CreateConnectionRequestType } from '@/api/connection/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { LoadingButton } from '@mui/lab';
import { Box, Button, IconButton, Stack } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { open } from '@tauri-apps/plugin-dialog';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import * as v from 'valibot';

import type { ConnectionSettingsProps } from '../types';

const formSchema = v.object({
  isPing: v.boolean(),
  name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
  file: v.string()
});

export default function SQLite({
  connection,
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const [isTauriEnv, setIsTauriEnv] = useState<boolean>(false);

  useEffect(() => {
    const checkTauri = async (): Promise<void> => {
      const isTauri = await tools.isTauri();
      setIsTauriEnv(isTauri);
    };
    checkTauri();
  }, []);

  const form = useForm({
    validators: {
      //@ts-ignore
      onSubmit: formSchema
    },
    onSubmit: async ({ value }): Promise<void> => {
      const data = {
        name: value.name,
        type: 'sqlite',
        options: value
      } as CreateConnectionRequestType;
      console.log('data', data);

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
      file: connection?.options?.file ?? ''
    }
  });

  const handleFileSelect = async (): Promise<void> => {
    if (!isTauriEnv) return;
    const selected = await open({
      multiple: false,
      directory: false
    });

    if (typeof selected === 'string') {
      form.setFieldValue('file', selected);
    }
  };

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

          <Box display={'flex'} flexDirection={'column'}>
            <form.Field name='file'>
              {(field): JSX.Element => (
                <>
                  <Box display={'flex'} alignItems={'flex-end'} flex={1}>
                    <FieldInput
                      value={field.state.value}
                      error={field.state.meta.errors.length > 0}
                      label={locales.file}
                      onChange={(e): void => field.handleChange(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    {isTauriEnv && (
                      <IconButton onClick={handleFileSelect} size='small' sx={{ mb: 1 }}>
                        <CustomIcon type='ellipsisVertical' size='s' />
                      </IconButton>
                    )}
                  </Box>
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
            onClick={(): void => {
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
            onClick={(): void => {
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
