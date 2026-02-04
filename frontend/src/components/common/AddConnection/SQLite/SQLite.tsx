import type { CreateConnectionRequestType } from '@/api/connection/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button, Stack } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { open } from '@tauri-apps/plugin-dialog';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import * as v from 'valibot';

import { tools } from '@/core/utils';
import type { ConnectionSettingsProps } from '../types';

const formSchema = v.object({
  isPing: v.boolean(),
  name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
  path: v.string()
});

export default function SQLite({
  connection,
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    tools.isTauri().then((result) => {
      setIsDesktop(result);
    });
  }, []);

  const form = useForm({
    validators: {
      onSubmit: formSchema
    },
    onSubmit: async ({ value }): Promise<void> => {
      const data = {
        name: value.name,
        type: 'sqlite',
        options: value
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
      path: connection?.options?.path ?? ''
    }
  });

  const handleFileSelect = async (): Promise<void> => {
    if (isDesktop) {
      const selected = await open({
        multiple: false,
        directory: false
      });

      if (typeof selected === 'string') {
        form.setFieldValue('path', selected);
      }
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

          <form.Field name='path'>
            {(field): JSX.Element => (
              <Box display={'flex'} flexDirection={'row'} flex={1} alignItems={'center'}>
                <Box flex={1}>
                  <FieldInput
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    label={locales.file}
                    onChange={(e): void => field.handleChange(e.target.value)}
                    endAdornment={isDesktop && <CustomIcon type='ellipsisVertical' onClick={handleFileSelect} />}
                  />
                </Box>
                <FormError mb={1} errors={field.state.meta.errors} />
              </Box>
            )}
          </form.Field>
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
