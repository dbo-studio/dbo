import { useTabStore } from '@/src/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
import CustomIcon from '../../../../../base/CustomIcon/CustomIcon';
import { RemoveSortButtonProps } from './types';

export default function RemoveSortButton({ sort }: RemoveSortButtonProps) {
  const { removeSort } = useTabStore();

  const handleRemoveSort = () => {
    removeSort(sort);
  };
  return (
    <IconButton className='remove-sort-btn' onClick={handleRemoveSort}>
      <CustomIcon type='mines' size='xs' />
    </IconButton>
  );
}
