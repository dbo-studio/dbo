import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { IconButton } from '@mui/material';
import type { RemoveFilterButtonProps } from '../../types.ts';

export default function RemoveFilterButton({ filter }: RemoveFilterButtonProps) {
  const { removeFilter } = useTabStore();
  const { runQuery } = useDataStore();

  const handleRemoveFilter = () => {
    removeFilter(filter);
    if (filter.isActive) {
      runQuery().then();
    }
  };

  return (
    <IconButton className='remove-filter-btn' onClick={handleRemoveFilter}>
      <CustomIcon type='mines' size='xs' />
    </IconButton>
  );
}
