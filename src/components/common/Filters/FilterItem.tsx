import { PgsqlFilterConditions } from '@/src/core/constants';
import { useUUID } from '@/src/hooks';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { EventFor } from '@/src/types';
import { FilterType } from '@/src/types/Tab';
import { Box, Checkbox, Input, NativeSelect } from '@mui/material';
import { useState } from 'react';
import { ColumnOrColumnGroup } from 'react-data-grid';
import AddFilterButton from './AddFilterButton';
import RemoveFilterButton from './RemoveFilterButton';
import { FilterItemProps } from './types';

export default function FilterItem({ filter, columns, filterLength }: FilterItemProps) {
  const { upsertFilters } = useTabStore();
  const [currentFilter, setCurrentFilter] = useState<FilterType>({
    index: filter.index,
    column: filter.column,
    operator: filter.operator,
    value: filter.value,
    isActive: filter.isActive
  });

  const uuidColumns = useUUID(columns.length);
  const uuidOperators = useUUID(columns.length);

  const handleChange = (
    type: 'column' | 'operator' | 'value' | 'isActive',
    e: EventFor<'select', 'onChange'> | EventFor<'input', 'onChange'> | any
  ) => {
    const value = e.target.value as string;
    const newFilter = {
      index: currentFilter.index,
      column: type == 'column' ? value : currentFilter.column,
      operator: type == 'operator' ? value : currentFilter.operator,
      value: type == 'value' ? value : currentFilter.value,
      isActive: type == 'isActive' ? e.target.checked : currentFilter.isActive
    };
    setCurrentFilter(newFilter);
    upsertFilters(newFilter);
  };

  return (
    <Box display='flex' flexDirection='row' alignItems='center'>
      <Box>
        <Checkbox size='small' checked={currentFilter.isActive} onChange={(e) => handleChange('isActive', e)} />
      </Box>
      <Box>
        <NativeSelect size='small' value={currentFilter.column} onChange={(e) => handleChange('column', e)}>
          {columns.map((c: ColumnOrColumnGroup<any, any>, index: number) => (
            <option key={uuidColumns[index]} value={c.name as string}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Box>
      <Box mr={1} ml={1}>
        <NativeSelect size='small' value={currentFilter.operator} onChange={(e) => handleChange('operator', e)}>
          {PgsqlFilterConditions.map((c: string, index) => (
            <option key={uuidOperators[index]} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </Box>
      <Box flex={1}>
        <Input
          fullWidth
          size='small'
          value={currentFilter.value}
          onChange={(e: EventFor<'input', 'onChange'>) => handleChange('value', e)}
        />
      </Box>
      <Box ml={1} mr={1}>
        <RemoveFilterButton filter={filter} />
        <AddFilterButton filterLength={filterLength} />
      </Box>
    </Box>
  );
}
