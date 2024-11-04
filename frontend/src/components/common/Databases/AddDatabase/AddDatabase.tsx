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
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string(),
  template: z.string(),
  encoding: z.string().optional(),
  table_space: z.string().optional()
});

export default function AddDatabase({ onClose }: { onClose: () => void }) {
  const { currentConnection } = useConnectionStore();
  const [metadata, setMetadata] = useState<undefined | DatabaseMetaDataType>(undefined);

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
    validatorAdapter: zodValidator(),
    validators: {
      onChange: formSchema
    },
    onSubmit: async ({ value }) => {
      try {
        //todo: add db to list after success create
        await createDatabase({
          connection_id: currentConnection?.id,
          name: value.name,
          template: value.template,
          encoding: value.encoding,
          tableSpace: value.tableSpace
        });
        toast.success(locales.database_create_success);
        form.reset();
        onClose();
      } catch (err) {
        console.log(err);
      }
    },
    defaultValues: {
      connection_id: undefined,
      name: undefined,
      template: undefined,
      encoding: undefined,
      tableSpace: undefined
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
                  helperText={field.state.meta.errors.join(', ')}
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
                  helperText={field.state.meta.errors.join(', ')}
                  label={locales.encoding}
                  emptyLabel={locales.empty_encoding}
                  value={undefined}
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
                  helperText={field.state.meta.errors.join(', ')}
                  label={locales.template}
                  emptyLabel={locales.empty_template}
                  value={undefined}
                  error={field.state.meta.errors.length > 0}
                  disabled={metadata?.templates?.length === 0}
                  size='medium'
                  options={metadata?.templates?.map((s) => ({ value: s, label: s }))}
                  onChange={(e) => field.handleChange(e.value)}
                />
              )}
            </form.Field>
            <Box mb={2} />
            <form.Field name='tableSpace'>
              {(field) => (
                <SelectInput
                  helperText={field.state.meta.errors.join(', ')}
                  label={locales.table_space}
                  emptyLabel={locales.empty_table_space}
                  value={undefined}
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
