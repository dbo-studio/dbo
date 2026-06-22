import { tools } from '@/core/utils';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType } from '@/types/Data';
import type { JSX } from 'react';
import { ColumnsContainerStyled } from './Columns.styled';
import ColumnItem from './ColumnItem';

export default function Columns(): JSX.Element {
  const windowSize = useWindowSize();

  const columns = useDataStore((state) => state.columns);
  const isDataFetching = useDataStore((state) => state.isDataFetching);

  const updateColumns = useDataStore((state) => state.updateColumns);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
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
    toggleReRunQuery();
  };

  return (
    <ColumnsContainerStyled height={windowSize.height}>
      {columns?.map((c: ColumnType) => (
        <ColumnItem onClick={() => void handleCheckToggle(c)} key={tools.uuid()} column={c} />
      ))}
    </ColumnsContainerStyled>
  );
}
