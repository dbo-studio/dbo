import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import InlineSqlEditor from '@/components/base/InlineSqlEditor/InlineSqlEditor';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { DataTabType } from '@/types';
import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { SubmitButtonStyled } from './InlineQuery.styled';

export default function InlineQuery() {
  const selectedTab = useSelectedTab<DataTabType>();
  const columns = useDataStore((state) => state.columns);
  const [value, setValue] = useState(selectedTab?.inlineQuery ?? '');

  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const runQuery = useDataStore((state) => state.runQuery);

  const handleUpdateQuery = (v: string) => {
    if (!selectedTab) return;

    updateSelectedTab({
      ...selectedTab,
      inlineQuery: v
    });
  };

  useEffect(() => {
    setValue(selectedTab?.inlineQuery ?? '');
  }, [selectedTab?.id]);

  const handleRunQuery = async (query?: string) => {
    if (query !== undefined) handleUpdateQuery(query);
    await runQuery();
  };

  return (
    <Stack direction='row' flex={1} minWidth={0} alignItems='center'>
      <Box flex={1} minWidth={0}>
        <InlineSqlEditor
          columns={columns ?? []}
          placeholder={locales.inline_query_placeholder}
          value={value}
          onChange={(v) => setValue(v)}
          onBlur={handleUpdateQuery}
          onEnter={(q) => void handleRunQuery(q)}
        />
      </Box>

      <SubmitButtonStyled variant='contained' onClick={() => void handleRunQuery()}>
        <CustomIcon type='check' size='s' />
      </SubmitButtonStyled>
    </Stack>
  );
}
