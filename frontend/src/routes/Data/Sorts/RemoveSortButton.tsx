import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
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
