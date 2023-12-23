import { useAppStore } from '@/src/store/zustand';
import { IconButton } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import { AddFilterButtonProps } from './types';

export default function AddFilterButton({ filterLength }: AddFilterButtonProps) {
  const { upsertFilters } = useAppStore();

  const handleAddNewFilter = () => {
    upsertFilters({
      index: uuidv4(),
      column: '',
      operator: '',
      value: '',
      isActive: true
    });
  };
  return (
    <IconButton onClick={handleAddNewFilter}>
      <CustomIcon type='plus' size='xs' />
    </IconButton>
  );
}
