import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, Typography } from '@mui/material';
import { ChatHistoryItemStyled } from '../ChatHistory.styled';
import { ChatHistoryItemProps } from '../types';

export default function ChatHistoryItem({ item, onClick, onDelete }: ChatHistoryItemProps) {
  return (
    <ChatHistoryItemStyled justifyContent={'space-between'} width={'100%'} direction={'row'}>
      <Box display={'flex'} alignItems={'center'} onClick={onClick}>
        <CustomIcon type={'message'} size='xs' />

        <Typography color={'textText'} variant='caption' ml={1}>
          {item.title}
        </Typography>
      </Box>
      <CustomIcon type={'close'} size='xs' onClick={onDelete} />
    </ChatHistoryItemStyled>
  );
}
