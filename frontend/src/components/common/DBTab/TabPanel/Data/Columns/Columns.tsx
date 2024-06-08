import { useWindowSize } from '@/src/hooks/useWindowSize.hook';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { ColumnType } from '@/src/types/Data';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Theme, useTheme } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import ColumnItem from './ColumnItem';

export default function Columns() {
  const windowSize = useWindowSize();

  const theme: Theme = useTheme();
  const { getColumns, updateColumns } = useDataStore();
  const { updateColumns: updateTabColumns } = useTabStore();

  const handleCheckToggle = async (column: ColumnType) => {
    column.isActive = !column.isActive;
    const newColumns = getColumns().map((c: ColumnType) => {
      if (c.key == column.key) {
        return column;
      }
      return c;
    });

    await updateColumns(newColumns);

    const c = newColumns.filter((c) => c.isActive).map((c) => c.name);

    updateTabColumns([...c]);
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
    >
      {getColumns(false, false).map((c: ColumnType) => (
        <ColumnItem onClick={() => handleCheckToggle(c)} key={uuidv4()} column={c} />
      ))}
    </Box>
  );
}
