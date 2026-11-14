import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import type { CreateConnectionRequestType, SQLiteOptionsType } from '@/api/connection/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { open } from '@tauri-apps/plugin-dialog';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import * as v from 'valibot';

import { tools } from '@/core/utils';
import ConnectionEnvField from '../ConnectionEnvField';
import type { ConnectionSettingsProps } from '../types';
import { ConnectionFormBodyStyled, ConnectionFormContainerStyled } from '../AddConnection.styled';
import ConnectionFormSection from '../ConnectionFormSection';
const formSchema = v.object({
  isPing: v.boolean(),
  name: v.pipe(v.string(), v.minLength(1, 'At least 1 character')),
  env: v.picklist(['', 'dev', 'uat', 'prod']),
  path: v.pipe(v.string(), v.minLength(1, 'At least 1 character'))
});

export default function SQLite({
  connection,
  submitLabel,
  onClose,
  onPing,
  onSubmit,
  pingLoading,
  submitLoading
}: ConnectionSettingsProps): JSX.Element {
  const [isDesktop, setIsDesktop] = useState(false);
  const options = connection?.options as SQLiteOptionsType | undefined;

  useEffect(() => {
    tools
      .isTauri()
      .then((result) => setIsDesktop(result))
      .catch(() => undefined);
  }, []);

  const form = useForm({
    validators: {
      onSubmit: formSchema
    },
    onSubmit: ({ value }): void => {
      const data = {
        name: value.name,
        type: 'sqlite',
        env: value.env,
        options: { path: value.path }
      } as CreateConnectionRequestType;

      if (value.isPing) {
        onPing(data);
        return;
      }

      onSubmit(data);
    },
    defaultValues: {
      isPing: false,
      name: connection?.name ?? '',
      env: connection?.env ?? '',
      path: options?.path ?? ''
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

        <ConnectionFormSection title={locales.connection_section_database_file}>
          <form.Field name='path'>
            {(field): JSX.Element => (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <FieldInput
                      name='path'
                      value={field.state.value}
                      error={field.state.meta.errors.length > 0}
                      fullWidth={true}
                      label={locales.file}
                      placeholder='/path/to/database.sqlite'
                      onChange={(e): void => field.handleChange(e.target.value)}
                    />
                  </Box>
                  {isDesktop && (
                    <Button
                      type='button'
                      variant='outlined'
                      data-testid='sqlite-browse'
                      sx={{ mb: 1 }}
                      onClick={() => void handleFileSelect()}
                    >
                      {locales.browse}
                    </Button>
                  )}
                </Box>
                <FormError mb={1} errors={field.state.meta.errors} />
                {!isDesktop && (
                  <Typography variant='caption' color='textSubdued'>
                    {locales.sqlite_path_hint}
                  </Typography>
                )}
              </Box>
            )}
          </form.Field>
        </ConnectionFormSection>
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
          <span>{locales.test}</span>
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
            <span>{submitLabel ?? (connection ? locales.update : locales.create)}</span>
          </Button>
        </Stack>
      </ModalFooter>
    </ConnectionFormContainerStyled>
  );
}
