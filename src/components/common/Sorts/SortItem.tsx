import { PgsqlSorts } from '@/src/core/constants';
import { useUUID } from '@/src/hooks';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { EventFor } from '@/src/types';
import { ColumnType } from '@/src/types/Data';
import { SortType } from '@/src/types/Tab';
import { Box, Checkbox, NativeSelect } from '@mui/material';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AddSortButton from './AddSortButton';
import RemoveSortButton from './RemoveSortButton';
import { SortItemProps } from './types';

export default function SortItem({ sort, columns, sortLength }: SortItemProps) {
  const { upsertSorts } = useTabStore();
  const [currentSort, setCurrentSort] = useState<SortType>({
    index: sort.index,
    column: sort.column,
    operator: sort.operator,
    isActive: sort.isActive
  });

  const uuidOperators = useUUID(columns.length);

  const handleChange = (
    type: 'column' | 'operator' | 'isActive',
    e: EventFor<'select', 'onChange'> | EventFor<'input', 'onChange'> | any
  ) => {
    const value = e.target.value as string;
    const newSort = {
      index: currentSort.index,
      column: type == 'column' ? value : currentSort.column,
      operator: type == 'operator' ? value : currentSort.operator,
      isActive: type == 'isActive' ? e.target.checked : currentSort.isActive
    };
    setCurrentSort(newSort);
    upsertSorts(newSort);
  };

  return (
    <Box className='sort-item' display='flex' flexDirection='row' alignItems='center'>
      <Box>
        <Checkbox size='small' checked={currentSort.isActive} onChange={(e) => handleChange('isActive', e)} />
      </Box>
      <Box>
        <NativeSelect size='small' value={currentSort.column} onChange={(e) => handleChange('column', e)}>
          {columns.map((c: ColumnType) => (
            <option key={uuidv4()} value={c.key as string}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Box>
      <Box mr={1} ml={1}>
        <NativeSelect size='small' value={currentSort.operator} onChange={(e) => handleChange('operator', e)}>
          {PgsqlSorts.map((c: string, index) => (
            <option key={uuidOperators[index]} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </Box>
      <Box ml={1} mr={1}>
        <RemoveSortButton sort={sort} />
        <AddSortButton sortLength={sortLength} />
      </Box>
    </Box>
  );
}
