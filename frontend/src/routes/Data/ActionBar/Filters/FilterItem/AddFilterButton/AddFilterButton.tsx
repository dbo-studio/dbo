import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { PgsqlFilterConditions, PgsqlFilterNext } from '@/core/constants';
import { tools } from '@/core/utils/tools.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { IconButton } from '@mui/material';
import type { JSX } from 'react';
import type { AddFilterButtonProps } from '../../types.ts';
export default function AddFilterButton({ columns }: AddFilterButtonProps): JSX.Element {
  const upsertFilters = useTabStore((state) => state.upsertFilters);

  const handleAddNewFilter = async (): Promise<void> => {
    await upsertFilters({
      index: tools.uuid(),
      column: columns[0].name,
      operator: PgsqlFilterConditions[0],
      value: '',
      isActive: true,
      next: PgsqlFilterNext[0]
    });
  };

  return (
    <IconButton aria-label='add-filter-btn' className='add-filter-btn' onClick={handleAddNewFilter}>
      <CustomIcon type='plus' size='s' />
    </IconButton>
  );
}
