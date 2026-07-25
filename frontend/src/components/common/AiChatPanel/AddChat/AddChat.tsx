import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { IconButton, Tooltip } from '@mui/material';

export default function AddChat({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip title={locales.new_chat}>
      <IconButton size='small' onClick={onClick}>
        <CustomIcon type='plus' />
      </IconButton>
    </Tooltip>
  );
}
