import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { PgsqlSorts } from '@/core/constants';
import { useSelectedTab } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Checkbox } from '@mui/material';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StyledTableHead, StyledTableRow, TableHeader } from '../DataGrid.styled';
import DataGridResizer from '../DataGridResizer/DataGridResizer';
import type { DataGridTableHeaderRowProps } from '../types';

export default function DataGridTableHeaderRow({
  columns,
  startResize,
  resizingColumnId
}: DataGridTableHeaderRowProps): JSX.Element {
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);
  const selectedTab = useSelectedTab();
  const removeSort = useTabStore((state) => state.removeSort);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const updateSorts = useTabStore((state) => state.updateSorts);

  const getColumnSort = useCallback(
    (columnName: string) => {
      if (!selectedTab?.sorts) return null;
      return selectedTab.sorts.find((sort) => sort.column === columnName && sort.isActive) ?? null;
    },
    [selectedTab?.sorts]
  );

  const handleColumnSort = useCallback(
    async (columnName: string, e: React.MouseEvent): Promise<void> => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-resizer]') || target.closest('input[type="checkbox"]') || target.tagName === 'INPUT') {
        return;
      }

      e.stopPropagation();
      const currentSort = getColumnSort(columnName);

      if (!currentSort) {
        await updateSorts([{
          index: uuidv4(),
          column: columnName,
          operator: PgsqlSorts[0],
          isActive: true
        }]);
        toggleReRunQuery();
      } else if (currentSort.operator === 'ASC') {
        await updateSorts([{
          ...currentSort,
          operator: PgsqlSorts[1]
        }]);
        toggleReRunQuery();
      } else {
        removeSort(currentSort);
        toggleReRunQuery();
      }

    },
    [getColumnSort, updateSorts, removeSort, toggleReRunQuery]
  );

  return (
    <StyledTableHead>
      <StyledTableRow>
        {columns.map((column) => {
          const isCurrentColumnResizing = resizingColumnId === column.name;

          if (column.name === 'select') {
            return (
              <TableHeader
                key={column.name}
                style={{
                  position: 'relative',
                  minWidth: '30px',
                  maxWidth: '30px',
                  width: '30px',
                  boxSizing: 'border-box',
                  padding: 0
                }}
              >
                <Checkbox
                  sx={{ padding: 0 }}
                  size={'small'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    if (e.target.checked) {
                      const rows = useDataStore.getState().rows ?? [];
                      const allRows = rows.map((row, index) => ({
                        index,
                        selectedColumn: '',
                        row
                      }));
                      updateSelectedRows(allRows, true);
                    } else {
                      updateSelectedRows([], true);
                    }
                  }}
                  onClick={(e: React.MouseEvent): void => {
                    e.stopPropagation();
                  }}
                />
              </TableHeader>
            );
          }

          const columnSort = getColumnSort(column.name);
          const sortIcon = columnSort?.operator === 'ASC' ? 'arrowUp' : columnSort?.operator === 'DESC' ? 'arrowDown' : 'sort';

          return (
            <TableHeader
              key={column.name}
              style={{
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={(e): Promise<void> => handleColumnSort(column.name, e)}
            >
              <Box display='flex' alignItems='center' gap={0.5}>
                <span>{column.name}</span>
                <CustomIcon type={sortIcon} size='xs' />
              </Box>
              <DataGridResizer
                columnId={column.name}
                isResizing={isCurrentColumnResizing}
                onResizeStart={startResize}
              />
            </TableHeader>
          );
        })}
      </StyledTableRow>
    </StyledTableHead>
  );
}
