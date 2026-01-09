import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { PgsqlSorts } from '@/core/constants';
import { tools } from '@/core/utils/tools.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { IconButton } from '@mui/material';
import type { JSX } from 'react';
import type { AddSortButtonProps } from '../../types.ts';

export default function AddSortButton({ columns }: AddSortButtonProps): JSX.Element {
  const upsertSorts = useTabStore((state) => state.upsertSorts);

  const handleAddNewSort = async (): Promise<void> => {
    await upsertSorts({
      index: tools.uuid(),
      column: columns[0].name,
      operator: PgsqlSorts[0],
      isActive: true
    });
  };

  return (
    <IconButton aria-label={'add-sort-btn'} className='add-sort-btn' onClick={handleAddNewSort}>
      <CustomIcon type='plus' size='s' />
    </IconButton>
  );
}
