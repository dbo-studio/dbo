import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Stack, Switch, Tooltip, Typography } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import type { QueryEditorLeadingProps } from '../../types';

export default function QueryEditorLeading({ databases, schemas }: QueryEditorLeadingProps): JSX.Element {
  const selectedTab = useSelectedTab();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const enableEditorAi = useSettingStore((state) => state.enableEditorAi);
  const toggleEnableEditorAi = useSettingStore((state) => state.toggleEnableEditorAi);

  const [localSchema, setLocalSchema] = useState<string>(selectedTab?.options?.schema ?? '');
  const [localDatabase, setLocalDatabase] = useState<string>(selectedTab?.options?.database ?? '');

  useEffect(() => {
    if (!selectedTab) return;

    updateSelectedTab({ ...selectedTab, options: { database: localDatabase, schema: localSchema } });
  }, [localSchema, localDatabase]);

  return (
    <Stack spacing={2} direction={'row'}>
      <Stack direction={'row'} spacing={1} alignItems={'center'}>
        <Typography variant='caption' color='textText'>
          {locales.database}:
        </Typography>
        <SelectInput
          emptylabel={locales.database}
          value={localDatabase}
          disabled={databases?.length === 0}
          size='small'
          options={databases.map((s) => ({ value: s, label: s }))}
          onChange={(e): void => setLocalDatabase(e.value)}
        />
      </Stack>

      <Stack direction={'row'} spacing={1} alignItems={'center'}>
        <Typography color='textText' variant='caption'>
          {locales.schema}:
        </Typography>
        <SelectInput
          emptylabel={locales.schema}
          value={localSchema}
          disabled={schemas?.length === 0}
          size='small'
          options={schemas.map((s) => ({ value: s, label: s }))}
          onChange={(e): void => setLocalSchema(e.value)}
        />
      </Stack>

      <Stack direction={'row'} spacing={1} alignItems={'center'}>
        <CustomIcon type='bot' />
        <Tooltip title={enableEditorAi ? locales.enable_ai : locales.disable_ai}>
          <Switch size='small' checked={enableEditorAi} onChange={() => toggleEnableEditorAi()} />
        </Tooltip>
      </Stack>
    </Stack>
  );
}
