import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { IconButton } from '@mui/material';

export default function AddChat({ onClick }: { onClick: () => void }) {
  return (
    <IconButton size='small' onClick={onClick}>
      <CustomIcon type='plus' />
    </IconButton>
  );
}
