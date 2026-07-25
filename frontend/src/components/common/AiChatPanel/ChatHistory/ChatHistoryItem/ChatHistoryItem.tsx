import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, Typography } from '@mui/material';
import { ChatHistoryItemStyled } from '../ChatHistory.styled';
import { ChatHistoryItemProps } from '../types';

export default function ChatHistoryItem({ item, onClick, onDelete }: ChatHistoryItemProps) {
  return (
    <ChatHistoryItemStyled direction='row' onClick={onClick}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <CustomIcon type={'message'} size='xs' />

        <Typography
          color={'textText'}
          variant='caption'
          sx={{
            ml: 1
          }}
        >
          {item.title}
        </Typography>
      </Box>
      <CustomIcon type={'close'} size='xs' onClick={onDelete} />
    </ChatHistoryItemStyled>
  );
}
