import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { PgsqlSorts } from '@/core/constants';
import { useSelectedTab } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType, TabType } from '@/types';
import { Box, Checkbox } from '@mui/material';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SelectTableHeader, SortableTableHeader, StyledTableHead, StyledTableRow } from '../DataGrid.styled';
import DataGridResizer from '../DataGridResizer/DataGridResizer';
import type { DataGridTableHeaderRowProps } from '../types';

export default function DataGridTableHeaderRow({
  columns,
  startResize,
  resizingColumnId
}: DataGridTableHeaderRowProps): JSX.Element {
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);
  const selectedTab = useSelectedTab<DataTabType>();
  const removeSort = useTabStore((state) => state.removeSort);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const updateSorts = useTabStore((state) => state.updateSorts);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

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
        await updateSorts([
          {
            index: uuidv4(),
            column: columnName,
            operator: PgsqlSorts[0],
            isActive: true
          }
        ]);
      } else if (currentSort.operator === PgsqlSorts[0]) {
        await updateSorts([
          {
            ...currentSort,
            operator: PgsqlSorts[1]
          }
        ]);
      } else {
        removeSort(currentSort);
      }

      if (selectedTab?.pagination?.page ?? 0 > 1) {
        const pagination = selectedTab?.pagination ?? { page: 1, limit: 100 };
        pagination.page = 1;
        updateSelectedTab({
          ...(selectedTab ?? ({} as TabType)),
          pagination
        });
      }

      toggleReRunQuery();
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
              <SelectTableHeader key={column.name}>
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
              </SelectTableHeader>
            );
          }

          const columnSort = getColumnSort(column.name);
          const sortIcon =
            columnSort?.operator === 'ASC' ? 'arrowUp' : columnSort?.operator === 'DESC' ? 'arrowDown' : 'sort';

          return (
            <SortableTableHeader key={column.name} onClick={(e): Promise<void> => handleColumnSort(column.name, e)}>
              <Box display='flex' alignItems='center' gap={0.5}>
                <span>{column.name}</span>
                <CustomIcon type={sortIcon} size='xs' />
              </Box>
              <DataGridResizer
                columnId={column.name}
                isResizing={isCurrentColumnResizing}
                onResizeStart={startResize}
              />
            </SortableTableHeader>
          );
        })}
      </StyledTableRow>
    </StyledTableHead>
  );
}
