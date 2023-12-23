import { useAppStore } from '@/src/store/zustand';
import { IconButton } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import { RemoveFilterButtonProps } from './types';

export default function RemoveFilterButton({ filter }: RemoveFilterButtonProps) {
  const { removeFilter } = useAppStore();

  const handleRemoveFilter = () => {
    removeFilter(filter);
  };
  return (
    <IconButton onClick={handleRemoveFilter}>
      <CustomIcon type='mines' size='xs' />
    </IconButton>
  );
}
