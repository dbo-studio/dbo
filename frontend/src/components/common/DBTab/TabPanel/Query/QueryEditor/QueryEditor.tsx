import CodeEditorV2 from '@/components/base/CodeEditorV2/CodeEditorV2';
import DBDataGrid from '@/components/shared/DBDataGrid/DBDataGrid';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box, useTheme } from '@mui/material';
import { QueryEditorProps } from '../types';

export default function QueryEditor({ autocomplete }: QueryEditorProps) {
  const theme = useTheme();
  const windowSize = useWindowSize();
  const { getRows } = useDataStore();

  return (
    <Box display={'flex'} flexDirection={'column'} height={windowSize.height}>
      <Box flex={1} borderBottom={`1px solid ${theme.palette.divider}`}>
        <CodeEditorV2 autocomplete={autocomplete} />
      </Box>
      {getRows() && getRows().length > 0 && <DBDataGrid />}
    </Box>
  );
}
