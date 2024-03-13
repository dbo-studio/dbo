import { tools } from '@/src/core/utils';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { StandardSQL, sql } from '@codemirror/lang-sql';
import { Box } from '@mui/material';
import { useState } from 'react';
import CodeEditor from '../../base/CodeEditor/CodeEditor';
import DBDataGrid from '../DBDataGrid/DBDataGrid';

export default function QueryEditor() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getRows, runQuery } = useDataStore();

  const getData = async () => {
    setIsLoading(true);
    await runQuery();
    setIsLoading(false);
  };

  return (
    <Box height={tools.screenMaxHeight()}>
      <Box flex={1}>
        <CodeEditor
          extensions={[
            sql({
              dialect: StandardSQL,
              upperCaseKeywords: true,
              schema: {
                addons: ['id', 'user_id']
              }
            })
          ]}
          autoFocus={true}
          value={query}
          onChange={setQuery}
          editable={true}
        />
      </Box>
      {getRows().length > 0 && <DBDataGrid />}
    </Box>
  );
}
