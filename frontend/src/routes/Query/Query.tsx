import api from '@/api';
import ResizableYBox from '@/components/base/ResizableBox/ResizableYBox.tsx';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor.tsx';
import type { SqlEditorSettingType } from '@/components/base/SqlEditor/types';
import DataGrid from '@/components/shared/DBDataGrid/DataGrid.tsx';
import { useWindowSize } from '@/hooks';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AutoCompleteType } from '@/types';
import { Box } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

export default function Query() {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const windowSize = useWindowSize();
  const { getQuery, updateQuery } = useTabStore();
  const [autocomplete, setAutocomplete] = useState<AutoCompleteType | null>(null);
  const [value, setValue] = useState('');
  const [setting, setSetting] = useState<SqlEditorSettingType>({
    database: '',
    schema: ''
  });

  const { mutateAsync: autocompleteMutate, isPending: pendingAutocomplete } = useMutation({
    mutationFn: api.query.autoComplete,
    onError: (error) => {
      console.error('🚀 ~ handleSave ~ error:', error);
    }
  });

  useEffect(() => {
    if (autocomplete || !currentConnection || pendingAutocomplete) return;

    autocompleteMutate({
      connectionId: currentConnection.id,
      fromCache: false,
      database: setting.database === '' ? undefined : setting.database,
      schema: setting.schema === '' ? undefined : setting.schema
    }).then((res) => {
      setAutocomplete(res);
    });
  }, [setting, currentConnection]);

  useEffect(() => {
    handleChangeValue();
  }, [selectedTab?.id]);

  const handleChangeValue = () => {
    setValue(getQuery());
  };

  const handleUpdateState = (query: string) => {
    updateQuery(query);
  };

  return (
    <>
      <QueryEditorActionBar
        databases={autocomplete?.databases ?? []}
        schemas={autocomplete?.schemas ?? []}
        onFormat={() => handleChangeValue()}
        onChange={setSetting}
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
