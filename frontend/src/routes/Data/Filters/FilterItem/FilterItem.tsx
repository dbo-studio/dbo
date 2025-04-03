import { PgsqlFilterConditions, PgsqlFilterNext } from '@/core/constants';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { EventFor, FilterType } from '@/types';
import { Box, Checkbox } from '@mui/material';
import { type JSX, useState } from 'react';

import FieldInput from '@/components/base/FieldInput/FieldInput.tsx';
import SelectInput from '@/components/base/SelectInput/SelectInput.tsx';
import { useSelectedTab } from '@/hooks/useSelectedTab.tsx';
import locales from '@/locales';
import type { FilterItemProps } from '../types.ts';
import AddFilterButton from './AddFilterButton/AddFilterButton.tsx';
import RemoveFilterButton from './RemoveFilterButton/RemoveFilterButton.tsx';

export default function FilterItem({ filter, columns }: FilterItemProps): JSX.Element {
  const selectedTab = useSelectedTab();
  const { upsertFilters } = useTabStore();

  const [currentFilter, setCurrentFilter] = useState<FilterType>({
    index: filter.index,
    column: filter.column,
    operator: filter.operator,
    value: filter.value,
    next: filter.next,
    isActive: filter.isActive
  });

  const handleChange = (type: 'column' | 'operator' | 'value' | 'next' | 'isActive', value: any): FilterType => {
    const newFilter = {
      index: currentFilter.index,
      column: type === 'column' ? value : currentFilter.column,
      operator: type === 'operator' ? value : currentFilter.operator,
      value: type === 'value' ? value : currentFilter.value,
      next: type === 'next' ? value : currentFilter.next,
      isActive: type === 'isActive' ? value : currentFilter.isActive
    };

    setCurrentFilter(newFilter);
    return newFilter;
  };

  if (!selectedTab) {
    return <></>;
  }

  return (
    <Box aria-label={'filter-item'} className='filter-item' display='flex' flexDirection='row' alignItems='center'>
      <Box>
        <Checkbox
          size='small'
          checked={currentFilter.isActive}
          onChange={(e): void => {
            upsertFilters(selectedTab, handleChange('isActive', e.target.checked)).then();
          }}
        />
      </Box>
      <Box>
        <SelectInput
          emptylabel={locales.no_column_found}
          value={currentFilter.column}
          disabled={columns.length === 0}
          size='small'
          options={columns.map((c) => ({ value: c.name as string, label: c.name }))}
          onChange={(e): FilterType => handleChange('column', e.value)}
        />
      </Box>
      <Box mr={1} ml={1}>
        <SelectInput
          value={currentFilter.operator}
          size='small'
          options={PgsqlFilterConditions.map((c) => ({ value: c as string, label: c }))}
          onChange={(e): FilterType => handleChange('operator', e.value)}
        />
      </Box>
      <Box flex={1} mr={1}>
        <FieldInput
          margin='none'
          fullWidth
          size='small'
          value={currentFilter.value}
          onBlur={(): Promise<void> => upsertFilters(selectedTab, currentFilter)}
          onChange={(e: EventFor<'input', 'onChange'>): FilterType => handleChange('value', e.target.value)}
        />
      </Box>
      <Box>
        <SelectInput
          value={currentFilter.next}
          size='small'
          options={PgsqlFilterNext.map((c) => ({ value: c as string, label: c }))}
          onChange={(e): FilterType => handleChange('next', e.value)}
        />
      </Box>
      <Box ml={1} mr={1}>
        <RemoveFilterButton filter={filter} />
        <AddFilterButton columns={columns} />
      </Box>
    </Box>
  );
}
