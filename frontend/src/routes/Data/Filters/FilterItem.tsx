import { PgsqlFilterConditions, PgsqlFilterNext } from '@/core/constants';
import { useUUID } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, EventFor, FilterType } from '@/types';
import { Box, Checkbox } from '@mui/material';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import SelectOption from '@/components/base/SelectInput/SelectOption';
import AddFilterButton from './AddFilterButton';
import RemoveFilterButton from './RemoveFilterButton';
import type { FilterItemProps } from './types';

export default function FilterItem({ filter, columns }: FilterItemProps) {
  const { upsertFilters } = useTabStore();
  const uuidOperators = useUUID(PgsqlFilterConditions.length);
  const [currentFilter, setCurrentFilter] = useState<FilterType>({
    index: filter.index,
    column: filter.column,
    operator: filter.operator,
    value: filter.value,
    next: filter.next,
    isActive: filter.isActive
  });

  const handleChange = (
    type: 'column' | 'operator' | 'value' | 'next' | 'isActive',
    e: EventFor<'select', 'onChange'> | EventFor<'input', 'onChange'> | any
  ): FilterType => {
    const value = e.target.value as string;
    const newFilter = {
      index: currentFilter.index,
      column: type === 'column' ? value : currentFilter.column,
      operator: type === 'operator' ? value : currentFilter.operator,
      value: type === 'value' ? value : currentFilter.value,
      next: type === 'next' ? value : currentFilter.next,
      isActive: type === 'isActive' ? e.target.checked : currentFilter.isActive
    };

    setCurrentFilter(newFilter);
    return newFilter;
  };

  return (
    <Box className='filter-item' display='flex' flexDirection='row' alignItems='center'>
      <Box>
        <Checkbox
          size='small'
          checked={currentFilter.isActive}
          onChange={(e) => {
            upsertFilters(handleChange('isActive', e));
          }}
        />
      </Box>
      <Box>
        <SelectInput
          margin='none'
          size='small'
          value={currentFilter.column}
          onChange={(e) => handleChange('column', e)}
        >
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
          value={currentFilter.operator}
          onChange={(e) => handleChange('operator', e)}
        >
          {PgsqlFilterConditions.map((c: string, index) => (
            <SelectOption key={uuidOperators[index]} value={c}>
              {c}
            </SelectOption>
          ))}
        </SelectInput>
      </Box>
      <Box flex={1} mr={1}>
        <FieldInput
          margin='none'
          fullWidth
          size='small'
          value={currentFilter.value}
          onBlur={(e: EventFor<'input', 'onBlur'>) => upsertFilters(currentFilter)}
          onChange={(e: EventFor<'input', 'onChange'>) => handleChange('value', e)}
        />
      </Box>
      <Box>
        <SelectInput margin='none' size='small' value={currentFilter.next} onChange={(e) => handleChange('next', e)}>
          {PgsqlFilterNext.map((c: string, index: number) => (
            <SelectOption key={uuidOperators[index]} value={c}>
              {c}
            </SelectOption>
          ))}
        </SelectInput>
      </Box>
      <Box ml={1} mr={1}>
        <RemoveFilterButton filter={filter} />
        <AddFilterButton columns={columns} />
      </Box>
    </Box>
  );
}
