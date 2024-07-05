import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
import CustomIcon from '../../../../../base/CustomIcon/CustomIcon';
import { RemoveFilterButtonProps } from './types';

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
