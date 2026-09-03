import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import InlineSqlEditor from '@/components/base/InlineSqlEditor/InlineSqlEditor';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { DataTabType } from '@/types';
import { Box } from '@mui/material';
import { useCallback, useRef, useState } from 'react';
import { InlineQueryStackStyled, SubmitButtonStyled } from './InlineQuery.styled';

export default function InlineQuery() {
  const selectedTab = useSelectedTab<DataTabType>();
  const columns = useDataStore((state) => state.columns);
  const tabInlineQuery = selectedTab?.inlineQuery ?? '';
  const [value, setValue] = useState(tabInlineQuery);
  const [prevTabId, setPrevTabId] = useState(selectedTab?.id);
  const latestQueryRef = useRef(tabInlineQuery);

  if (selectedTab?.id !== prevTabId) {
    setPrevTabId(selectedTab?.id);
    setValue(tabInlineQuery);
    latestQueryRef.current = tabInlineQuery;
  }

  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const runQuery = useDataStore((state) => state.runQuery);

  const handleUpdateQuery = useCallback(
    (v: string) => {
      const tab = useTabStore.getState().selectedTab<DataTabType>();
      if (!tab) return;
      updateSelectedTab({
        ...tab,
        inlineQuery: v
      });
    },
    [updateSelectedTab]
  );

  const handleRunQuery = useCallback(
    async (query?: string) => {
      if (query !== undefined) handleUpdateQuery(query);
      await runQuery();
    },
    [handleUpdateQuery, runQuery]
  );

  return (
    <InlineQueryStackStyled direction='row' data-testid='inline-query'>
      <Box
        sx={{
          flex: 1,
          minWidth: 0
        }}
      >
        <InlineSqlEditor
          columns={columns ?? []}
          placeholder={locales.inline_query_placeholder}
          value={value}
          onChange={(v) => {
            latestQueryRef.current = v;
            setValue(v);
          }}
          onBlur={handleUpdateQuery}
          onEnter={(q) => void handleRunQuery(q)}
        />
      </Box>
      <SubmitButtonStyled
        variant='contained'
        data-testid='inline-query-run'
        aria-label='Run inline query'
        onClick={() => void handleRunQuery(latestQueryRef.current)}
      >
        <CustomIcon type='check' size='s' />
      </SubmitButtonStyled>
    </InlineQueryStackStyled>
  );
}
