import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { IconButton } from '@mui/material';
import { useAiChat } from '../hooks/useAiChat';

export default function AddChat() {
  const { handleCreateChat } = useAiChat();

  return (
    <IconButton size='small' onClick={() => void handleCreateChat()}>
      <CustomIcon type='plus' />
    </IconButton>
  );
}
