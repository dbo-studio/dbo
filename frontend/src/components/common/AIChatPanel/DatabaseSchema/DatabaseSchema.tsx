import SelectInput from '@/components/base/SelectInput/SelectInput';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AutoCompleteType } from '@/types';
import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';

export default function DatabaseSchema({ autocomplete }: { autocomplete: AutoCompleteType }) {
  const [localSchema, setLocalSchema] = useState<string>('');
  const [localDatabase, setLocalDatabase] = useState<string>('');

  const selectedTab = useSelectedTab();
  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);

  useEffect(() => {
    if (!selectedTab) return;

    const database =
      localDatabase === '' ? (selectedTab?.options?.database ?? autocomplete?.databases[0]) : localDatabase;
    const schema = localSchema === '' ? (selectedTab?.options?.schema ?? autocomplete?.schemas[0]) : localSchema;

    setLocalDatabase(database);
    setLocalSchema(schema);
    updateContext({ ...context, database, schema });
  }, []);

  const handleDatabaseChange = (database: string) => {
    setLocalDatabase(database);
    updateContext({ ...context, database });
  };

  const handleSchemaChange = (schema: string) => {
    setLocalSchema(schema);
    updateContext({ ...context, schema });
  };

  return (
    <Stack direction={'row'} spacing={1}>
      <SelectInput
        emptylabel={locales.no_active_database_find}
        value={localDatabase}
        disabled={autocomplete?.databases?.length === 0}
        size='small'
        options={autocomplete?.databases.map((s) => ({ value: s, label: s })) ?? []}
        onChange={(e): void => handleDatabaseChange(e.value)}
      />
      <SelectInput
        emptylabel={locales.no_active_schema_find}
        value={localSchema}
        disabled={autocomplete?.schemas?.length === 0}
        size='small'
        options={autocomplete?.schemas.map((s) => ({ value: s, label: s })) ?? []}
        onChange={(e): void => handleSchemaChange(e.value)}
      />
    </Stack>
  );
}
