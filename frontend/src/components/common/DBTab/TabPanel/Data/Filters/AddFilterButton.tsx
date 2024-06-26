import { PgsqlFilterConditions, PgsqlFilterNext } from '@/core/constants';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import CustomIcon from '../../../../../base/CustomIcon/CustomIcon';
import { AddFilterButtonProps } from './types';

export default function AddFilterButton({ columns }: AddFilterButtonProps) {
  const { upsertFilters } = useTabStore();

  const handleAddNewFilter = () => {
    upsertFilters({
      index: uuidv4(),
      column: columns[0].name,
      operator: PgsqlFilterConditions[0],
      value: '',
      isActive: true,
      next: PgsqlFilterNext[0]
    });
  };
  return (
    <IconButton className='add-filter-btn' onClick={handleAddNewFilter}>
      <CustomIcon type='plus' size='s' />
    </IconButton>
  );
}
