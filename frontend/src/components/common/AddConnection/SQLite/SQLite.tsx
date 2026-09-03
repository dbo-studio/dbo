import type { CreateConnectionRequestType, SQLiteOptionsType } from '@/api/connection/types';
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
import {
  ConnectionFormBodyStyled,
  ConnectionFormContainerStyled,
  ConnectionFormFooterStyled,
  SQLitePathRowStyled
} from '../AddConnection.styled';
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
  const options = connection?.options as SQLiteOptionsType | undefined;

  useEffect(() => {
    tools
      .isTauri()
      .then((result) => setIsDesktop(result))
      .catch((e) => console.log('🚀 ~ SQLite ~ e:', e));
  }, []);

  const form = useForm({
    validators: {
      onSubmit: formSchema
    },
    onSubmit: ({ value }): void => {
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
    <ConnectionFormContainerStyled>
      <ConnectionFormBodyStyled>
        <form
          onSubmit={(e): void => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit().then();
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

          <form.Field name='path'>
            {(field): JSX.Element => (
              <SQLitePathRowStyled>
                <Box
                  sx={{
                    flex: 1
                  }}
                >
                  <FieldInput
                    name='path'
                    value={field.state.value}
                    error={field.state.meta.errors.length > 0}
                    label={locales.file}
                    onChange={(e): void => field.handleChange(e.target.value)}
                    endAdornment={
                      isDesktop && <CustomIcon type='ellipsisVertical' onClick={() => void handleFileSelect()} />
                    }
                  />
                </Box>
                <FormError mb={1} errors={field.state.meta.errors} />
              </SQLitePathRowStyled>
            )}
          </form.Field>
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
            disabled={pingLoading}
            loading={pingLoading}
            onClick={(): void => {
              form.state.values.isPing = true;
              void form.handleSubmit().then();
            }}
            size='small'
            variant='contained'
            color='secondary'
          >
            <span>{locales.test}</span>
          </Button>
          <Button
            data-testid='create-connection'
            loadingPosition='start'
            disabled={submitLoading}
            loading={submitLoading}
            onClick={(): void => {
              form.state.values.isPing = false;
              void form.handleSubmit().then();
            }}
            size='small'
            variant='contained'
          >
            <span>{connection ? locales.update : locales.create}</span>
          </Button>
        </Stack>
      </ConnectionFormFooterStyled>
    </ConnectionFormContainerStyled>
  );
}
