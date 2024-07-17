import SelectInput from '@/components/base/SelectInput/SelectInput';
import SelectOption from '@/components/base/SelectInput/SelectOption';
import { useUUID } from '@/hooks';
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

  const handleDatabaseChange = async (name: string) => {
    setDatabase(name);
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
        {currentConnection?.schemas?.map((t: string, i: number) => (
          <SelectOption value={t} key={uuidSchemas[i]}>
            {t}
          </SelectOption>
        ))}
      </SelectInput>
    </Stack>
  );
}
