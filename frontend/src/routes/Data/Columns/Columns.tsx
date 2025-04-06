import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType } from '@/types/Data';
import { Box, type Theme, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ColumnItem from './ColumnItem';

export default function Columns(): JSX.Element {
  const selectedTab = useSelectedTab();
  const windowSize = useWindowSize();

  const theme: Theme = useTheme();
  const { getColumns, updateColumns, runQuery, loading } = useDataStore();
  const { updateColumns: updateTabColumns } = useTabStore();

  const handleCheckToggle = async (column: ColumnType): Promise<void> => {
    if (loading || !selectedTab) return;

    column.isActive = !column.isActive;
    const newColumns = getColumns(selectedTab).map((c: ColumnType) => {
      if (c.name === column.name) {
        return column;
      }
      return c;
    });

    await updateColumns(selectedTab, newColumns);
    const c = newColumns.filter((c) => c.isActive).map((c) => c.name);
    updateTabColumns(selectedTab, [...c]);
    runQuery(selectedTab).then();
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
      {getColumns(selectedTab).map((c: ColumnType) => (
        <ColumnItem onClick={(): Promise<void> => handleCheckToggle(c)} key={uuidv4()} column={c} />
      ))}
    </Box>
  );
}
