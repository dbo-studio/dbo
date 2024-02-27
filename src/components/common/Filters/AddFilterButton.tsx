import { useTabStore } from '@/src/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function AddFilterButton() {
  const { upsertFilters } = useTabStore();

  const handleAddNewFilter = () => {
    upsertFilters({
      index: uuidv4(),
      column: '',
      operator: '',
      value: '',
      isActive: true,
      next: ''
    });
  };
  return (
    <IconButton className='add-filter-btn' onClick={handleAddNewFilter}>
      <CustomIcon type='plus' size='s' />
    </IconButton>
  );
}
