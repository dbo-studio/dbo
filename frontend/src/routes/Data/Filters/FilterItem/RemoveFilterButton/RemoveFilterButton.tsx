import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { useSelectedTab } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { IconButton } from '@mui/material';
import type { JSX } from 'react';
import type { RemoveFilterButtonProps } from '../../types.ts';

export default function RemoveFilterButton({ filter }: RemoveFilterButtonProps): JSX.Element {
  const selectedTab = useSelectedTab();
  const { removeFilter } = useTabStore();
  const { runQuery } = useDataStore();

  const handleRemoveFilter = (): void => {
    if (!selectedTab) return;

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
