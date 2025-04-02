import api from '@/api';
import ResizableYBox from '@/components/base/ResizableBox/ResizableYBox.tsx';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor.tsx';
import DataGrid from '@/components/shared/DBDataGrid/DataGrid.tsx';
import { useWindowSize } from '@/hooks';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

export default function Query() {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const windowSize = useWindowSize();
  const { getQuery, updateQuery } = useTabStore();
  const [value, setValue] = useState('');

  const { data: autocomplete } = useQuery({
    queryKey: ['autocomplete', currentConnection?.id, selectedTab?.options?.database, selectedTab?.options?.schema],
    queryFn: () =>
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

  const handleChangeValue = () => {
    setValue(getQuery() ?? '');
  };

  const handleUpdateState = (query: string) => {
    updateQuery(query);
  };

  if (!selectedTab) {
    return <></>;
  }

  return (
    <>
      <QueryEditorActionBar
        databases={autocomplete?.databases ?? []}
        schemas={autocomplete?.schemas ?? []}
        onFormat={() => handleChangeValue()}
      />
      <Box display={'flex'} flexDirection={'column'} height={windowSize.height}>
        <Box display={'flex'} minHeight={'0'} flex={1} borderBottom={(theme) => `1px solid ${theme.palette.divider}`}>
          {autocomplete && <SqlEditor onChange={handleUpdateState} autocomplete={autocomplete} value={value} />}
        </Box>
        {autocomplete && (
          <ResizableYBox height={windowSize.heightNumber ? windowSize.heightNumber / 2 : 0} direction={'btt'}>
            <DataGrid editable={false} />
          </ResizableYBox>
        )}
      </Box>
    </>
  );
}
