import api from '@/api';
import ResizableYBox from '@/components/base/ResizableBox/ResizableYBox.tsx';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor.tsx';
import TestGrid from '@/components/common/DBDataGrid/TestGrid/TestGrid';
import { useCurrentConnection, useWindowSize } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AutoCompleteType } from '@/types';
import { Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

export default function Query(): JSX.Element {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const windowSize = useWindowSize();
  const { getQuery, updateQuery } = useTabStore();
  const [value, setValue] = useState('');
  const [showGrid, setShowGrid] = useState(false);
  const { getRows, getColumns, isDataFetching } = useDataStore();

  const { data: autocomplete } = useQuery({
    queryKey: ['autocomplete', currentConnection?.id, selectedTab?.options?.database, selectedTab?.options?.schema],
    queryFn: async (): Promise<AutoCompleteType> =>
      api.query.autoComplete({
        connectionId: currentConnection?.id ?? 0,
        fromCache: false,
        database: selectedTab?.options?.database === '' ? undefined : selectedTab?.options?.database,
        schema: selectedTab?.options?.schema === '' ? undefined : selectedTab?.options?.schema
      }),
    enabled: !!currentConnection
  });

  useEffect(() => {
    handleChangeValue();
  }, [selectedTab?.id]);

  const handleChangeValue = (): void => {
    setValue(getQuery());
  };

  const handleUpdateState = (query: string): void => {
    updateQuery(query);
  };

  const headers = getColumns(true);

  return (
    <>
      <QueryEditorActionBar
        databases={autocomplete?.databases ?? []}
        schemas={autocomplete?.schemas ?? []}
        onFormat={(): void => handleChangeValue()}
      />
      <Box display={'flex'} flexDirection={'column'} height={windowSize.height}>
        <Box
          display={'flex'}
          minHeight={'0'}
          flex={1}
          borderBottom={(theme): string => `1px solid ${theme.palette.divider}`}
        >
          {autocomplete && (
            <SqlEditor
              onMount={(): void => setShowGrid(true)}
              onBlur={handleUpdateState}
              autocomplete={autocomplete}
              value={value}
            />
          )}
        </Box>

        {showGrid && headers.length > 0 && (
          <ResizableYBox height={windowSize.heightNumber ? windowSize.heightNumber / 2 : 0} direction={'btt'}>
            <TestGrid editable={false} rows={getRows()} columns={getColumns(true)} loading={isDataFetching} />
          </ResizableYBox>
        )}
      </Box>
    </>
  );
}
