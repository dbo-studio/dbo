import api from '@/api';
import { AutoCompleteType } from '@/api/query/types';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import SelectOption from '@/components/base/SelectInput/SelectOption';
import { useUUID } from '@/hooks';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { QueryEditorLeadingProps } from '../../types';

export default function QueryEditorLeading({ onChange }: QueryEditorLeadingProps) {
  const { currentConnection } = useConnectionStore();
  const uuidDatabases = useUUID(currentConnection?.databases?.length);
  const uuidSchemas = useUUID(currentConnection?.schemas?.length);

  const [schema, setSchema] = useState<string>(currentConnection?.currentSchema ?? '');
  const [database, setDatabase] = useState<string>(currentConnection?.currentDatabase ?? '');

  const [schemas, setSchemas] = useState<string[]>(currentConnection?.schemas ?? []);

  const { request: autocomplete, pending: pending } = useAPI({
    apiMethod: api.query.autoComplete
  });

  const handleDatabaseChange = async (name: string) => {
    if (pending) {
      return;
    }
    const res = await autocomplete({
      connection_id: currentConnection?.id,
      type: 'schemas',
      database: name
    } as AutoCompleteType);

    setDatabase(name);
    setSchemas(res);
  };

  const handleSchemaChange = (name: string) => {
    setSchema(name);
  };

  useEffect(() => {
    onChange({
      database,
      schema
    });
  }, [schema, database]);

  return (
    <Stack spacing={2} direction={'row'}>
      <SelectInput
        sx={{ marginBottom: '0' }}
        value={database}
        defaultValue={database}
        onChange={(e) => handleDatabaseChange(e.target.value)}
        name='type'
        size='small'
      >
        <SelectOption value={''}></SelectOption>
        {currentConnection?.databases?.map((t: string, i: number) => (
          <SelectOption value={t} key={uuidDatabases[i]}>
            {t}
          </SelectOption>
        ))}
      </SelectInput>

      <SelectInput
        sx={{ marginBottom: '0' }}
        value={schema}
        defaultValue={schema}
        onChange={(e) => handleSchemaChange(e.target.value)}
        name='type'
        size='small'
      >
        <SelectOption value={''}></SelectOption>
        {schemas.map((t: string, i: number) => (
          <SelectOption value={t} key={uuidSchemas[i]}>
            {t}
          </SelectOption>
        ))}
      </SelectInput>
    </Stack>
  );
}
