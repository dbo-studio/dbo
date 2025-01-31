import api from '@/api';
import type { DatabaseMetaDataType } from '@/api/database/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { LoadingButton } from '@mui/lab';
import { Box, Button } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(1),
  template: z.string().optional(),
  encoding: z.string().optional(),
  table_space: z.string().optional()
});

export default function AddDatabase({ onClose }: { onClose: () => void }) {
  const [metadata, setMetadata] = useState<undefined | DatabaseMetaDataType>(undefined);
  const currentConnection = useConnectionStore((state) => state.currentConnection);
  const updateCurrentConnection = useConnectionStore((state) => state.updateCurrentConnection);

  const { request: createDatabase, pending } = useAPI({
    apiMethod: api.database.createDatabase
  });

  const { request: getDatabaseMetadata } = useAPI({
    apiMethod: api.database.getDatabaseMetadata
  });

  useEffect(() => {
    getDatabaseMetadata(currentConnection?.id).then((res) => {
      setMetadata(res);
    });
  }, []);

  const form = useForm({
    validators: {
      onChange: formSchema
    },
    onSubmit: async ({ value }) => {
      try {
        await createDatabase({
          connection_id: currentConnection?.id,
          name: value.name,
          template: value.template,
          encoding: value.encoding,
          tableSpace: value.table_space
        });
        toast.success(locales.database_create_success);
        form.reset();

        if (currentConnection && value.name) {
          const databases = currentConnection.databases ?? [];
          databases.push(value.name);
          updateCurrentConnection({
            ...currentConnection,
            databases: databases
          });
        }
        onClose();
      } catch (err) {
        if (isAxiosError(err)) {
          toast.error(err.message);
        }
        console.log('🚀 ~ AddDatabase.tsx: ~ err:', err);
      }
    },
    defaultValues: {
      name: '',
      template: '',
      encoding: '',
      table_space: ''
    }
  });

  return (
    currentConnection &&
    metadata && (
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

            <form.Field name='encoding'>
              {(field) => (
                <SelectInput
                  helpertext={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                  label={locales.encoding}
                  emptylabel={locales.empty_encoding}
                  value={field.state.value}
                  error={field.state.meta.errors.length > 0}
                  disabled={metadata?.encodings?.length === 0}
                  size='medium'
                  options={metadata?.encodings?.map((s) => ({ value: s, label: s }))}
                  onChange={(e) => field.handleChange(e.value)}
                />
              )}
            </form.Field>

            <Box mb={2} />
            <form.Field name='template'>
              {(field) => (
                <SelectInput
                  helpertext={field.state.meta.errors.join(', ')}
                  label={locales.template}
                  emptylabel={locales.empty_template}
                  value={field.state.value}
                  error={field.state.meta.errors.length > 0}
                  disabled={metadata?.templates?.length === 0}
                  size='medium'
                  options={metadata?.templates?.map((s) => ({ value: s, label: s }))}
                  onChange={(e) => field.handleChange(e.value)}
                />
              )}
            </form.Field>
            <Box mb={2} />
            <form.Field name='table_space'>
              {(field) => (
                <SelectInput
                  helpertext={field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                  label={locales.table_space}
                  emptylabel={locales.empty_table_space}
                  value={field.state.value}
                  error={field.state.meta.errors.length > 0}
                  disabled={metadata?.tableSpaces?.length === 0}
                  size='medium'
                  options={metadata?.tableSpaces?.map((s) => ({ value: s, label: s }))}
                  onChange={(e) => field.handleChange(e.value)}
                />
              )}
            </form.Field>
          </form>
        </Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <Button size='small' onClick={onClose}>
            {locales.cancel}
          </Button>

          <LoadingButton
            disabled={pending}
            loading={pending}
            onClick={() => {
              form.handleSubmit().then();
            }}
            size='small'
            variant='contained'
          >
            <span>{locales.create}</span>
          </LoadingButton>
        </Box>
      </Box>
    )
  );
}
