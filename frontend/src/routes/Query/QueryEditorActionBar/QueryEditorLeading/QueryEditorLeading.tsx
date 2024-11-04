import SelectInput from '@/components/base/SelectInput/SelectInput';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import type { QueryEditorLeadingProps } from '../../types';

export default function QueryEditorLeading({ onChange }: QueryEditorLeadingProps) {
  const currentConnection = useConnectionStore((state) => state.currentConnection);

  const [schema, setSchema] = useState<string>(currentConnection?.currentSchema ?? '');
  const [database, setDatabase] = useState<string>(currentConnection?.currentDatabase ?? '');

  useEffect(() => {
    onChange({
      database,
      schema
    });
  }, [schema, database]);

  return (
    <Stack spacing={2} direction={'row'}>
      <SelectInput
        emptyLabel={locales.no_active_database_find}
        value={database}
        disabled={currentConnection?.databases?.length === 0}
        size='small'
        options={currentConnection?.databases?.map((s) => ({ value: s, label: s })) ?? []}
        onChange={(e) => setDatabase(e.value)}
      />

      <SelectInput
        emptyLabel={locales.no_active_schema_find}
        value={schema}
        disabled={currentConnection?.schemas?.length === 0}
        size='small'
        options={currentConnection?.schemas?.map((s) => ({ value: s, label: s })) ?? []}
        onChange={(e) => setSchema(e.value)}
      />
    </Stack>
  );
}
