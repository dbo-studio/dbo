import api from '@/api';
import type { DatabaseMetaDataType } from '@/api/database/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import SelectOption from '@/components/base/SelectInput/SelectOption';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoadingButton } from '@mui/lab';
import { Box, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface IFormInput {
  name: string;
  template?: string;
  encoding?: string;
  table_space?: string;
}

const formSchema = z.object({
  name: z.string(),
  template: z.string().optional(),
  encoding: z.string().optional(),
  table_space: z.string().optional()
});

type ValidationSchema = z.infer<typeof formSchema>;

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

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ValidationSchema>({
    resolver: zodResolver(formSchema)
  });

  const onSubmit: SubmitHandler<IFormInput> = async (data, e) => {
    e?.preventDefault();
    try {
      //todo: add db to list after success create
      await createDatabase({
        connection_id: currentConnection?.id,
        name: data.name,
        template: data.template,
        encoding: data.encoding,
        tableSpace: data.table_space
      });
      toast.success(locales.database_create_success);
      reset({ ...data });
      onClose();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    currentConnection &&
    metadata && (
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
            <Controller
              name='template'
              control={control}
              render={({ field }) => (
                <SelectInput {...field} label={locales.template} fullWidth error={!!errors.template}>
                  <SelectOption value={undefined} />
                  {metadata.templates.map((option) => (
                    <SelectOption key={option} value={option}>
                      {option}
                    </SelectOption>
                  ))}
                </SelectInput>
              )}
            />

            <Controller
              name='encoding'
              control={control}
              render={({ field }) => (
                <SelectInput {...field} label={locales.encoding} fullWidth error={!!errors.encoding}>
                  <SelectOption value={undefined} />
                  {metadata.encodings.map((option) => (
                    <SelectOption key={option} value={option}>
                      {option}
                    </SelectOption>
                  ))}
                </SelectInput>
              )}
            />

            <Controller
              name='table_space'
              control={control}
              render={({ field }) => (
                <SelectInput {...field} label={locales.table_space} fullWidth error={!!errors.table_space}>
                  <SelectOption value={undefined} />
                  {metadata.tableSpaces.map((option) => (
                    <SelectOption key={option} value={option}>
                      {option}
                    </SelectOption>
                  ))}
                </SelectInput>
              )}
            />
          </form>
        </Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <Button size='small' onClick={onClose}>
            {locales.cancel}
          </Button>

          <LoadingButton
            disabled={pending}
            loading={pending}
            onClick={handleSubmit(onSubmit)}
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
