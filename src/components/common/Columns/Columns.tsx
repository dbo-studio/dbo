import { useDataStore } from '@/src/store/dataStore/data.store';
import { ColumnType } from '@/src/types/Data';
import { Box, Theme, useTheme } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import ColumnItem from './ColumnItem';

export default function Columns() {
  const theme: Theme = useTheme();
  const { getColumns, updateColumns } = useDataStore();

  const handleCheckToggle = (column: ColumnType) => {
    column.isActive = !column.isActive;
    const newColumns = getColumns().map((c: ColumnType) => {
      if (c.key == column.key) {
        return column;
      }
      return c;
    });
    updateColumns(newColumns);
  };

  return (
    <Box
      padding={theme.spacing(1)}
      borderRight={`1px solid ${theme.palette.divider}`}
      height={'100vh'}
      maxHeight={'100vh'}
      minHeight={'100vh'}
      overflow={'auto'}
      display={'flex'}
      flexDirection={'column'}
    >
      {getColumns().map((c: ColumnType) => (
        <ColumnItem onClick={() => handleCheckToggle(c)} key={uuidv4()} column={c} />
      ))}
    </Box>
  );
}
