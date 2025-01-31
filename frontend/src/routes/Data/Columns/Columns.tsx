import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType } from '@/types/Data';
import { Box, type Theme, useTheme } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import ColumnItem from './ColumnItem';

export default function Columns() {
  const windowSize = useWindowSize();

  const theme: Theme = useTheme();
  const { getColumns, updateColumns, runQuery, loading } = useDataStore();
  const { updateColumns: updateTabColumns } = useTabStore();

  const handleCheckToggle = async (column: ColumnType) => {
    if (loading) return;

    column.isActive = !column.isActive;
    const newColumns = getColumns().map((c: ColumnType) => {
      if (c.key === column.key) {
        return column;
      }
      return c;
    });

    await updateColumns(newColumns);
    const c = newColumns.filter((c) => c.isActive).map((c) => c.name);
    updateTabColumns([...c]);
    runQuery().then();
  };

  return (
    <Box
      padding={theme.spacing(1)}
      borderRight={`1px solid ${theme.palette.divider}`}
      height={windowSize.height}
      maxHeight={windowSize.height}
      minHeight={windowSize.height}
      overflow={'auto'}
      display={'flex'}
      flexDirection={'column'}
      minWidth={'130px'}
    >
      {getColumns().map((c: ColumnType) => (
        <ColumnItem onClick={() => handleCheckToggle(c)} key={uuidv4()} column={c} />
      ))}
    </Box>
  );
}
