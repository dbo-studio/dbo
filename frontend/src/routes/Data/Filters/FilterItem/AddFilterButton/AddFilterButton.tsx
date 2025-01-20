import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { PgsqlFilterConditions, PgsqlFilterNext } from '@/core/constants';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { IconButton } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import type { AddFilterButtonProps } from '../../types.ts';

export default function AddFilterButton({ columns }: AddFilterButtonProps) {
  const { upsertFilters } = useTabStore();

  const handleAddNewFilter = async () => {
    await upsertFilters({
      index: uuidv4(),
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
