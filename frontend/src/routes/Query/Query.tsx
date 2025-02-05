import api from '@/api';
import type {AutoCompleteRequestType} from '@/api/query/types';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor.tsx';
import type {SqlEditorSettingType} from '@/components/base/SqlEditor/types';
import DataGrid from '@/components/shared/DBDataGrid/DataGrid.tsx';
import {useWindowSize} from '@/hooks';
import useAPI from '@/hooks/useApi.hook';
import {useConnectionStore} from '@/store/connectionStore/connection.store';
import {useTabStore} from '@/store/tabStore/tab.store';
import type {AutoCompleteType} from '@/types';
import {Box, useTheme} from '@mui/material';
import {useEffect, useState} from 'react';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

export default function Query() {
  const theme = useTheme();
  const { currentConnection } = useConnectionStore();
  const windowSize = useWindowSize();
  const { getQuery, updateQuery, getSelectedTab } = useTabStore();
  const [autocomplete, setAutocomplete] = useState<AutoCompleteType | null>(null);
  const [value, setValue] = useState('');
  const [setting, setSetting] = useState<SqlEditorSettingType>({
    database: '',
    schema: ''
  });

  const { request: getAutoComplete, pending } = useAPI({
    apiMethod: api.query.autoComplete
  });

  useEffect(() => {
    if (setting.schema === '' || setting.database === '' || autocomplete || !currentConnection || pending) return;

    getAutoComplete({
      connection_id: currentConnection.id,
      schema: setting.schema,
      database: setting.database,
      from_cache: true
    } as AutoCompleteRequestType).then((res) => {
      setAutocomplete(res);
    });
  }, [setting, currentConnection]);

  useEffect(() => {
    handleChangeValue();
  }, [getSelectedTab()?.id]);

  const handleChangeValue = () => {
    setValue(getQuery());
  };

  const handleUpdateState = (query: string) => {
    updateQuery(query);
  };

  return (
    <>
      <QueryEditorActionBar onFormat={() => handleChangeValue()} onChange={setSetting} />
      <Box display={'flex'} flexDirection={'column'} height={windowSize.height}>
        <Box display={'flex'} minHeight={'0'} flex={1} borderBottom={`1px solid ${theme.palette.divider}`}>
          {autocomplete && <SqlEditor onChange={handleUpdateState} autocomplete={autocomplete} value={value} />}
        </Box>
        {autocomplete && (
          <Box display={'flex'} flex={1}>
            <DataGrid editable={false} />
          </Box>
        )}
      </Box>
    </>
  );
}
