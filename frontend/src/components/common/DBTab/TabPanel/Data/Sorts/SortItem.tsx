import { PgsqlSorts } from '@/src/core/constants';
import { useUUID } from '@/src/hooks';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { EventFor } from '@/src/types';
import { ColumnType } from '@/src/types/Data';
import { SortType } from '@/src/types/Tab';
import { Box, Checkbox } from '@mui/material';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SelectInput from '../../../../../base/SelectInput/SelectInput';
import SelectOption from '../../../../../base/SelectInput/SelectOption';
import AddSortButton from './AddSortButton';
import RemoveSortButton from './RemoveSortButton';
import { SortItemProps } from './types';

export default function SortItem({ sort, columns }: SortItemProps) {
  const { upsertSorts } = useTabStore();
  const uuidOperators = useUUID(columns.length);
  const [currentSort, setCurrentSort] = useState<SortType>({
    index: sort.index,
    column: sort.column,
    operator: sort.operator,
    isActive: sort.isActive
  });

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
        <SelectInput margin='none' size='small' value={currentSort.column} onChange={(e) => handleChange('column', e)}>
          {columns.map((c: ColumnType) => (
            <SelectOption key={uuidv4()} value={c.key as string}>
              {c.name}
            </SelectOption>
          ))}
        </SelectInput>
      </Box>
      <Box mr={1} ml={1}>
        <SelectInput
          margin='none'
          size='small'
          value={currentSort.operator}
          onChange={(e) => handleChange('operator', e)}
        >
          {PgsqlSorts.map((c: string, index) => (
            <SelectOption key={uuidOperators[index]} value={c}>
              {c}
            </SelectOption>
          ))}
        </SelectInput>
      </Box>
      <Box ml={1} mr={1}>
        <RemoveSortButton sort={sort} />
        <AddSortButton columns={columns} />
      </Box>
    </Box>
  );
}
