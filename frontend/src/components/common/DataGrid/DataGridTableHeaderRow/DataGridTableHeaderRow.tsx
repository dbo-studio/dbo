import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { PgsqlSorts } from '@/core/constants';
import { tools } from '@/core/utils';
import { useSelectedTab } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType, TabType } from '@/types';
import { Box, Checkbox, Stack, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { SelectTableHeader, SortableTableHeader, StyledTableHead, StyledTableRow } from '../DataGrid.styled';
import DataGridResizer from '../DataGridResizer/DataGridResizer';
import type { DataGridTableHeaderRowProps } from '../types';

export default function DataGridTableHeaderRow({
  columns,
  startResize,
  resizingColumnId
}: DataGridTableHeaderRowProps): JSX.Element {
  const selectedTab = useSelectedTab<DataTabType>();
  const theme = useTheme();

  const rows = useDataStore((s) => s.rows);
  const updateSelectedRows = useDataStore((s) => s.updateSelectedRows);
  const toggleReRunQuery = useDataStore((s) => s.toggleReRunQuery);

  const removeSort = useTabStore((s) => s.removeSort);
  const updateSorts = useTabStore((s) => s.updateSorts);
  const updateSelectedTab = useTabStore((s) => s.updateSelectedTab);

  const sorts = selectedTab?.sorts ?? [];

  const getColumnSort = useCallback(
    (column: string) => sorts.find((s) => s.column === column && s.isActive) ?? null,
    [sorts]
  );

  const resetPaginationIfNeeded = useCallback(() => {
    if ((selectedTab?.pagination?.page ?? 0) <= 1) return;

    const pagination = { ...(selectedTab?.pagination ?? { page: 1, limit: 100 }), page: 1 };

    updateSelectedTab({
      ...(selectedTab ?? ({} as TabType)),
      pagination
    });
  }, [selectedTab, updateSelectedTab]);

  const handleColumnSort = useCallback(
    (column: string, e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest('[data-resizer]') || target.closest('input')) return;

      e.stopPropagation();

      const currentSort = getColumnSort(column);

      if (!currentSort) {
        updateSorts([
          {
            index: tools.uuid(),
            column,
            operator: PgsqlSorts[0],
            isActive: true
          }
        ]);
      } else if (currentSort.operator === PgsqlSorts[0]) {
        updateSorts([{ ...currentSort, operator: PgsqlSorts[1] }]);
      } else {
        removeSort(currentSort);
      }

      resetPaginationIfNeeded();
      toggleReRunQuery();
    },
    [getColumnSort, removeSort, resetPaginationIfNeeded, toggleReRunQuery, updateSorts]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        updateSelectedRows([], true);
        return;
      }

      const allRows =
        rows?.map((row, index) => ({
          index,
          selectedColumn: '',
          row
        })) ?? [];

      updateSelectedRows(allRows, true);
    },
    [rows, updateSelectedRows]
  );

  const getSortIcon = (operator?: string) => {
    if (operator === 'ASC') return 'arrowUp';
    if (operator === 'DESC') return 'arrowDown';
    return 'sort';
  };

  return (
    <StyledTableHead>
      <StyledTableRow>
        {columns.map((column) => {
          const isResizing = resizingColumnId === column.name;

          if (column.name === 'select') {
            return (
              <SelectTableHeader key='select'>
                <Checkbox
                  sx={{ p: 0 }}
                  size='small'
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </SelectTableHeader>
            );
          }

          const columnSort = getColumnSort(column.name);
          const sortIcon = getSortIcon(columnSort?.operator);

          return (
            <SortableTableHeader key={column.name} onClick={(e) => handleColumnSort(column.name, e)}>
              <Box display='flex' alignItems='center' gap={0.5} justifyContent={'space-between'}>
                <Stack spacing={1} direction={'row'} alignItems={'center'}>
                  <Typography variant='body2'>{column.name}</Typography>
                  <Typography fontSize={10} color={theme.palette.text.placeholder}>
                    ({column.type})
                  </Typography>
                  {column.isPrimaryKey && <CustomIcon type={'key'} size='xs' color={theme.palette.text.placeholder} />}
                </Stack>
                <CustomIcon type={sortIcon} size='xs' />
              </Box>

              <DataGridResizer columnId={column.name} isResizing={isResizing} onResizeStart={startResize} />
            </SortableTableHeader>
          );
        })}
      </StyledTableRow>
    </StyledTableHead>
  );
}
