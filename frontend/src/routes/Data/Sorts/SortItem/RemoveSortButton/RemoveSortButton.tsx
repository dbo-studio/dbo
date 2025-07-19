import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { IconButton } from '@mui/material';
import type { JSX } from 'react';
import type { RemoveSortButtonProps } from '../../types.ts';

export default function RemoveSortButton({ sort }: RemoveSortButtonProps): JSX.Element {
  const removeSort = useTabStore((state) => state.removeSort);
  const runQuery = useDataStore((state) => state.runQuery);

  const handleRemoveSort = (): void => {
    removeSort(sort);
    if (sort.isActive) {
      runQuery().then();
    }
  };

  return (
    <IconButton className='remove-sort-btn' onClick={handleRemoveSort}>
      <CustomIcon type='mines' size='xs' />
    </IconButton>
  );
}
