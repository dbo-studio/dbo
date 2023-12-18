import { PgsqlFilterConditions } from '@/src/core/constants';
import { useUUID } from '@/src/hooks';
import { useAppStore } from '@/src/store/zustand';
import { EventFor } from '@/src/types';
import { FilterType } from '@/src/types/Tab';
import { Box, Checkbox, Input, NativeSelect } from '@mui/material';
import { useState } from 'react';
import { ColumnOrColumnGroup } from 'react-data-grid';

export default function FilterItem() {
  const { selectedTab, upsertFilters } = useAppStore();
  const [filter, setFilter] = useState<FilterType>({
    column: '',
    operator: '',
    value: '',
    isActive: false
  });

  const uuidColumns = useUUID(selectedTab?.columns.length);
  const uuidOperators = useUUID(selectedTab?.columns.length);

  const handleChange = (
    type: 'column' | 'operator' | 'value' | 'isActive',
    e: EventFor<'select', 'onChange'> | EventFor<'input', 'onChange'>
  ) => {
    const value = e.target.value as string;
    const newFilter = {
      column: type == 'column' ? value : filter.column,
      operator: type == 'operator' ? value : filter.operator,
      value: type == 'value' ? value : filter.value,
      isActive: type == 'isActive' ? e.target.checked : filter.isActive
    };
    setFilter(newFilter);
    upsertFilters(newFilter);
  };

  return (
    <>
      {selectedTab && (
        <Box>
          <Checkbox checked={filter.isActive} onChange={(e) => handleChange('isActive', e)} />
          <NativeSelect size='small' value={filter.column} onChange={(e) => handleChange('column', e)}>
            {selectedTab.columns.map((c: ColumnOrColumnGroup<any, any>, index: number) => (
              <option key={uuidColumns[index]} value={c.name as string}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect size='small' value={filter.operator} onChange={(e) => handleChange('operator', e)}>
            {PgsqlFilterConditions.map((c: string, index) => (
              <option key={uuidOperators[index]} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
          <Input
            size='small'
            value={filter.value}
            onChange={(e: EventFor<'input', 'onChange'>) => handleChange('value', e)}
          />
        </Box>
      )}
    </>
  );
}
