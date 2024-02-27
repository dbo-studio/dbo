import { PgsqlFilterConditions, PgsqlFilterNext } from '@/src/core/constants';
import { useUUID } from '@/src/hooks';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { ColumnType, EventFor, FilterType } from '@/src/types';
import { Box, Checkbox, Input } from '@mui/material';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SelectInput from '../../base/SelectInput/SelectInput';
import SelectOption from '../../base/SelectInput/SelectOption';
import AddFilterButton from './AddFilterButton';
import RemoveFilterButton from './RemoveFilterButton';
import { FilterItemProps } from './types';

export default function FilterItem({ filter, columns }: FilterItemProps) {
  const { upsertFilters } = useTabStore();
  const [currentFilter, setCurrentFilter] = useState<FilterType>({
    index: filter.index,
    column: filter.column,
    operator: filter.operator,
    value: filter.value,
    next: filter.next,
    isActive: filter.isActive
  });

  const uuidOperators = useUUID(PgsqlFilterConditions.length);

  const handleChange = (
    type: 'column' | 'operator' | 'value' | 'next' | 'isActive',
    e: EventFor<'select', 'onChange'> | EventFor<'input', 'onChange'> | any
  ) => {
    const value = e.target.value as string;
    const newFilter = {
      index: currentFilter.index,
      column: type == 'column' ? value : currentFilter.column,
      operator: type == 'operator' ? value : currentFilter.operator,
      value: type == 'value' ? value : currentFilter.value,
      next: type == 'next' ? value : currentFilter.next,
      isActive: type == 'isActive' ? e.target.checked : currentFilter.isActive
    };

    setCurrentFilter(newFilter);
    upsertFilters(newFilter);
  };

  return (
    <Box className='filter-item' display='flex' flexDirection='row' alignItems='center'>
      <Box>
        <Checkbox size='small' checked={currentFilter.isActive} onChange={(e) => handleChange('isActive', e)} />
      </Box>
      <Box>
        <SelectInput size='small' value={currentFilter.column} onChange={(e) => handleChange('column', e)}>
          {columns.map((c: ColumnType) => (
            <SelectOption key={uuidv4()} value={c.key as string}>
              {c.name}
            </SelectOption>
          ))}
        </SelectInput>
      </Box>
      <Box mr={1} ml={1}>
        <SelectInput size='small' value={currentFilter.operator} onChange={(e) => handleChange('operator', e)}>
          {PgsqlFilterConditions.map((c: string, index) => (
            <SelectOption key={uuidOperators[index]} value={c}>
              {c}
            </SelectOption>
          ))}
        </SelectInput>
      </Box>
      <Box flex={1} mr={1}>
        <Input
          fullWidth
          size='small'
          value={currentFilter.value}
          onChange={(e: EventFor<'input', 'onChange'>) => handleChange('value', e)}
        />
      </Box>
      <Box>
        <SelectInput size='small' value={currentFilter.next} onChange={(e) => handleChange('next', e)}>
          {PgsqlFilterNext.map((c: string, index: number) => (
            <SelectOption key={uuidOperators[index]} value={c}>
              {c}
            </SelectOption>
          ))}
        </SelectInput>
      </Box>
      <Box ml={1} mr={1}>
        <RemoveFilterButton filter={filter} />
        <AddFilterButton />
      </Box>
    </Box>
  );
}
