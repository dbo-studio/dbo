import { PgsqlSorts } from '@/core/constants';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { SortType } from '@/types/Tab.ts';
import { Box, Checkbox } from '@mui/material';
import { useState } from 'react';

import SelectInput from '@/components/base/SelectInput/SelectInput.tsx';
import locales from '@/locales';
import type { SortItemProps } from '../types.ts';
import AddSortButton from './AddSortButton/AddSortButton.tsx';
import RemoveSortButton from './RemoveSortButton/RemoveSortButton.tsx';

export default function SortItem({ sort, columns }: SortItemProps) {
  const { upsertSorts } = useTabStore();
  const [currentSort, setCurrentSort] = useState<SortType>({
    index: sort.index,
    column: sort.column,
    operator: sort.operator,
    isActive: sort.isActive
  });

  const handleChange = async (type: 'column' | 'operator' | 'isActive', value: any) => {
    const newSort = {
      index: currentSort.index,
      column: type === 'column' ? value : currentSort.column,
      operator: type === 'operator' ? value : currentSort.operator,
      isActive: type === 'isActive' ? value : currentSort.isActive
    };

    setCurrentSort(newSort);
    await upsertSorts(newSort);
  };

  return (
    <Box className='sort-item' display='flex' flexDirection='row' alignItems='center'>
      <Box>
        <Checkbox
          size='small'
          checked={currentSort.isActive}
          onChange={(e) => handleChange('isActive', e.target.checked)}
        />
      </Box>
      <Box>
        <SelectInput
          emptylabel={locales.no_column_found}
          value={currentSort.column}
          disabled={columns.length === 0}
          size='small'
          options={columns.map((c) => ({ value: c.key as string, label: c.name }))}
          onChange={(e) => handleChange('column', e.value)}
        />
      </Box>
      <Box mr={1} ml={1}>
        <SelectInput
          value={currentSort.operator}
          size='small'
          options={PgsqlSorts.map((c) => ({ value: c as string, label: c }))}
          onChange={(e) => handleChange('operator', e.value)}
        />
      </Box>
      <Box ml={1} mr={1}>
        <RemoveSortButton sort={sort} />
        <AddSortButton columns={columns} />
      </Box>
    </Box>
  );
}
