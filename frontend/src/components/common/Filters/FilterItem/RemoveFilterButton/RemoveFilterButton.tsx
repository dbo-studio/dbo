import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { IconButton } from '@mui/material';
import type { JSX } from 'react';
import type { RemoveFilterButtonProps } from '../../types.ts';

export default function RemoveFilterButton({ filter, apply }: RemoveFilterButtonProps): JSX.Element {
  const removeFilter = useTabStore((state) => state.removeFilter);

  const handleRemoveFilter = (): void => {
    removeFilter(filter);
    if (filter.isActive) {
      apply();
    }
  };

  return (
    <IconButton className='remove-filter-btn' onClick={handleRemoveFilter}>
      <CustomIcon type='mines' size='xs' />
    </IconButton>
  );
}
