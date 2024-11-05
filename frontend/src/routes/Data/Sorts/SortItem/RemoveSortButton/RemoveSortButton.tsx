import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { IconButton } from '@mui/material';
import type { RemoveSortButtonProps } from '../../types.ts';

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
