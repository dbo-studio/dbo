import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { EditorTabType } from '@/types';
import { Stack, Switch, Tooltip, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import type { QueryEditorLeadingProps } from '../../types';

export default function QueryEditorLeading({ databases, schemas }: QueryEditorLeadingProps): JSX.Element {
  const selectedTab = useSelectedTab<EditorTabType>();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const enableEditorAi = useSettingStore((state) => state.editor.enableEditorAi);
  const updateEditor = useSettingStore((state) => state.updateEditor);

  const [localSchema, setLocalSchema] = useState<string>((selectedTab?.schema as string) ?? '');
  const [localDatabase, setLocalDatabase] = useState<string>((selectedTab?.database as string) ?? '');
  const [prevTabId, setPrevTabId] = useState(selectedTab?.id);

  if (selectedTab?.id !== prevTabId) {
    setPrevTabId(selectedTab?.id);
    setLocalSchema((selectedTab?.schema as string) ?? '');
    setLocalDatabase((selectedTab?.database as string) ?? '');
  }

  const handleDatabaseChange = (database: string): void => {
    setLocalDatabase(database);
    if (!selectedTab) return;
    updateSelectedTab({ ...selectedTab, database, schema: localSchema });
  };

  const handleSchemaChange = (schema: string): void => {
    setLocalSchema(schema);
    if (!selectedTab) return;
    updateSelectedTab({ ...selectedTab, database: localDatabase, schema });
  };

  return (
    <Stack spacing={2} direction={'row'}>
      <Stack
        direction={'row'}
        spacing={1}
        sx={{
          alignItems: 'center'
        }}
      >
        <Typography variant='caption' color='textText'>
          {locales.database}:
        </Typography>
        <SelectInput
          emptylabel={locales.database}
          value={localDatabase}
          disabled={databases?.length === 0}
          size='small'
          options={databases.map((s) => ({ value: s, label: s }))}
          onChange={(e): void => handleDatabaseChange((e as SelectInputOption)?.value as string)}
        />
      </Stack>
      <Stack
        direction={'row'}
        spacing={1}
        sx={{
          alignItems: 'center'
        }}
      >
        <Typography color='textText' variant='caption'>
          {locales.schema}:
        </Typography>
        <SelectInput
          emptylabel={locales.schema}
          value={localSchema}
          disabled={schemas?.length === 0}
          size='small'
          options={schemas.map((s) => ({ value: s, label: s }))}
          onChange={(e): void => handleSchemaChange((e as SelectInputOption)?.value as string)}
        />
      </Stack>
      <Stack
        direction={'row'}
        spacing={1}
        sx={{
          alignItems: 'center'
        }}
      >
        <CustomIcon type='bot' />
        <Tooltip title={enableEditorAi ? locales.disable_ai : locales.enable_ai}>
          <Switch
            size='small'
            checked={enableEditorAi}
            onChange={() => updateEditor({ enableEditorAi: !enableEditorAi })}
          />
        </Tooltip>
      </Stack>
    </Stack>
  );
}
