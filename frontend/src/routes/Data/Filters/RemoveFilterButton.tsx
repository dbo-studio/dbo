import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
import type { RemoveFilterButtonProps } from './types';

export default function RemoveFilterButton({ filter }: RemoveFilterButtonProps) {
  const { removeFilter } = useTabStore();

  const handleRemoveFilter = () => {
    removeFilter(filter);
  };
  return (
    <IconButton className='remove-filter-btn' onClick={handleRemoveFilter}>
      <CustomIcon type='mines' size='xs' />
    </IconButton>
  );
}
