import { tools } from '@/src/core/utils';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { Box, useTheme } from '@mui/material';
import { EditorView } from '@uiw/react-codemirror';
import CodeEditor from '../../base/CodeEditor/CodeEditor';
import DBDataGrid from '../DBDataGrid/DBDataGrid';

export default function QueryEditor() {
  const theme = useTheme();
  const { getRows } = useDataStore();
  const { updateSelectedTab, selectedTab } = useTabStore();

  const handleChangeValue = (value: string) => {
    updateSelectedTab({
      ...selectedTab!,
      query: value
    });
  };

  const styleTheme = EditorView.baseTheme({
    '&.cm-editor.cm-focused': {
      outline: 'unset'
    }
  });

  return (
    <Box display={'flex'} flexDirection={'column'} height={tools.screenMaxHeight()}>
      <Box flex={1} borderBottom={`1px solid ${theme.palette.divider}`}>
        <CodeEditor
          height='100%'
          extensions={[
            sql({
              dialect: PostgreSQL,
              upperCaseKeywords: true,
              schema: {
                addons: ['id', 'user_id']
              }
            }),
            styleTheme
            // Prec.highest(
            //   keymap.of([
            //     {
            //       key: 'Tab',
            //       run: () => {
            //         return true;
            //       }
            //     }
            //   ])
            // )
          ]}
          autoFocus={true}
          value={selectedTab?.query}
          onChange={handleChangeValue}
          editable={true}
        />
      </Box>
      {getRows() && getRows().length > 0 && <DBDataGrid />}
    </Box>
  );
}
