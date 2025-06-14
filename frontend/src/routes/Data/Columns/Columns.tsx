import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType } from '@/types/Data';
import { Box, type Theme, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ColumnItem from './ColumnItem';

export default function Columns(): JSX.Element {
  const windowSize = useWindowSize();
  const theme: Theme = useTheme();

  const columns = useDataStore((state) => state.columns);
  const isDataFetching = useDataStore((state) => state.isDataFetching);

  const updateColumns = useDataStore((state) => state.updateColumns);
  const runQuery = useDataStore((state) => state.runQuery);
  const updateTabColumns = useTabStore((state) => state.updateColumns);

  const handleCheckToggle = async (column: ColumnType): Promise<void> => {
    if (isDataFetching) return;

    column.isActive = !column.isActive;
    const newColumns =
      columns?.map((c: ColumnType) => {
        if (c.name === column.name) {
          return column;
        }
        return c;
      }) ?? [];

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
      {columns?.map((c: ColumnType) => (
        <ColumnItem onClick={(): Promise<void> => handleCheckToggle(c)} key={uuidv4()} column={c} />
      ))}
    </Box>
  );
}
