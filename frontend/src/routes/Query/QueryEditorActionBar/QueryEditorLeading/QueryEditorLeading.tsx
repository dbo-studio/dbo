import SelectInput from '@/components/base/SelectInput/SelectInput';
import locales from '@/locales';
import { Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import type { QueryEditorLeadingProps } from '../../types';

export default function QueryEditorLeading({ databases, schemas, onChange }: QueryEditorLeadingProps) {
  const [localSchema, setLocalSchema] = useState<string>('');
  const [localDatabase, setLocalDatabase] = useState<string>('');

  useEffect(() => {
    onChange({
      database: localDatabase,
      schema: localSchema
    });
  }, [localSchema, localDatabase, onChange]);

  return (
    <Stack spacing={2} direction={'row'}>
      <Stack direction={'row'} spacing={1} alignItems={'center'}>
        <Typography variant='caption' color='textText'>
          {locales.database}:
        </Typography>
        <SelectInput
          emptylabel={locales.no_active_database_find}
          value={localDatabase}
          disabled={databases?.length === 0}
          size='small'
          options={databases.map((s) => ({ value: s, label: s }))}
          onChange={(e) => setLocalDatabase(e.value)}
        />
      </Stack>

      <Stack direction={'row'} spacing={1} alignItems={'center'}>
        <Typography color='textText' variant='caption'>
          {locales.schema}:
        </Typography>
        <SelectInput
          emptylabel={locales.no_active_schema_find}
          value={localSchema}
          disabled={schemas?.length === 0}
          size='small'
          options={schemas.map((s) => ({ value: s, label: s }))}
          onChange={(e) => setLocalSchema(e.value)}
        />
      </Stack>
    </Stack>
  );
}
