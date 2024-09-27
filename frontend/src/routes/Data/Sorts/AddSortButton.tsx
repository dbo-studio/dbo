import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { PgsqlSorts } from '@/core/constants';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import type { AddSortButtonProps } from './types';

export default function AddSortButton({ columns }: AddSortButtonProps) {
  const { upsertSorts } = useTabStore();

  const handleAddNewSort = () => {
    upsertSorts({
      index: uuidv4(),
      column: columns[0].name,
      operator: PgsqlSorts[0],
      isActive: true
    });
  };
  return (
    <IconButton className='add-sort-btn' onClick={handleAddNewSort}>
      <CustomIcon type='plus' size='s' />
    </IconButton>
  );
}
