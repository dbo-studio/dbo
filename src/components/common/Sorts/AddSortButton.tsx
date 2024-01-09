import { useTabStore } from '@/src/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import { AddSortButtonProps } from './types';

export default function AddSortButton({ sortLength }: AddSortButtonProps) {
  const { upsertSorts } = useTabStore();

  const handleAddNewSort = () => {
    upsertSorts({
      index: uuidv4(),
      column: '',
      operator: '',
      value: '',
      isActive: true
    });
  };
  return (
    <IconButton className='add-sort-btn' onClick={handleAddNewSort}>
      <CustomIcon type='plus' size='xs' />
    </IconButton>
  );
}
