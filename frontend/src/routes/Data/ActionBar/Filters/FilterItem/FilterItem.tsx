import { PgsqlFilterConditions, PgsqlFilterNext } from '@/core/constants';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { EventFor, FilterType } from '@/types';
import { Box, Checkbox } from '@mui/material';
import { type JSX, useCallback, useState } from 'react';

import FieldInput from '@/components/base/FieldInput/FieldInput.tsx';
import SelectInput from '@/components/base/SelectInput/SelectInput.tsx';
import { SelectInputOption } from '@/components/base/SelectInput/types.ts';
import locales from '@/locales';
import type { FilterItemProps } from '../types.ts';
import AddFilterButton from './AddFilterButton/AddFilterButton.tsx';
import RemoveFilterButton from './RemoveFilterButton/RemoveFilterButton.tsx';

export default function FilterItem({ filter, columns, apply }: FilterItemProps): JSX.Element {
  const upsertFilters = useTabStore((state) => state.upsertFilters);

  const [currentFilter, setCurrentFilter] = useState<FilterType>({
    index: filter.index,
    column: filter.column,
    operator: filter.operator,
    value: filter.value,
    next: filter.next,
    isActive: filter.isActive
  });

  const handleChange = useCallback(
    (type: 'column' | 'operator' | 'value' | 'next' | 'isActive', value: string | boolean): FilterType => {
      const newFilter = {
        index: currentFilter.index,
        column: type === 'column' ? (value as string) : currentFilter.column,
        operator: type === 'operator' ? (value as string) : currentFilter.operator,
        value: type === 'value' ? (value as string | number) : currentFilter.value,
        next: type === 'next' ? (value as string) : currentFilter.next,
        isActive: type === 'isActive' ? (value as boolean) : currentFilter.isActive
      };

      setCurrentFilter(newFilter);
      return newFilter;
    },
    []
  );

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
    if (e.key === 'Enter') {
      await upsertFilters(currentFilter);
      apply();
    }
  };

  return (
    <Box aria-label={'filter-item'} className='filter-item' display='flex' flexDirection='row' alignItems='center'>
      <Box>
        <Checkbox
          size='small'
          checked={currentFilter.isActive}
          onChange={(e): void => {
            upsertFilters(handleChange('isActive', e.target.checked));
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
          onChange={(e): void =>
            upsertFilters(handleChange('column', (e as unknown as SelectInputOption).value as string))
          }
        />
      </Box>
      <Box mr={1} ml={1}>
        <SelectInput
          value={currentFilter.operator}
          size='small'
          options={PgsqlFilterConditions.map((c) => ({ value: c as string, label: c }))}
          onChange={(e): void =>
            upsertFilters(handleChange('operator', (e as unknown as SelectInputOption).value as string))
          }
        />
      </Box>
      <Box flex={1} mr={1}>
        <FieldInput
          margin='none'
          fullWidth
          size='small'
          value={currentFilter.value}
          onBlur={(): void => upsertFilters(currentFilter)}
          onChange={(e: EventFor<'input', 'onChange'>): FilterType => handleChange('value', e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Box>
      <Box>
        <SelectInput
          value={currentFilter.next}
          size='small'
          options={PgsqlFilterNext.map((c) => ({ value: c as string, label: c }))}
          onChange={(e): void =>
            upsertFilters(handleChange('next', (e as unknown as SelectInputOption).value as string))
          }
        />
      </Box>
      <Box ml={1} mr={1}>
        <RemoveFilterButton apply={apply} filter={filter} />
        <AddFilterButton columns={columns} />
      </Box>
    </Box>
  );
}
