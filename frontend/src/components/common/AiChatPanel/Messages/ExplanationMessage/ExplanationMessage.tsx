import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import TypewriterEffectText from '@/components/base/TypewriterEffectText/TypewriterEffectText';
import { useAiStore } from '@/store/aiStore/ai.store';
import { IconButton, Typography } from '@mui/material';
import { Stack } from '@mui/system';
import type { ExplanationMessageProps } from '../../types';
import { ExplanationMessageStyled } from './ExplanationMessage.styled';

export default function ExplanationMessage({ message }: ExplanationMessageProps) {
  const handleEditButton = () => {
    const context = useAiStore.getState().context;
    const updateContext = useAiStore.getState().updateContext;
    const toggleMessageEdit = useAiStore.getState().toggleMessageEdit;

    updateContext({
      ...context,
      input: message.content
    });

    toggleMessageEdit()
  };

  return (
    <ExplanationMessageStyled user={message.role === 'user' ? 'true' : 'false'}>
      {message.role === 'assistant' && message.isNew ? (
        <TypewriterEffectText text={message.content} speed={30} />
      ) : (
        <Stack direction={'row'} justifyContent={'space-between'}>
          <Typography variant={'body2'} whiteSpace={'pre-wrap'} lineHeight={1.6}>
            {message.content}
          </Typography>

          <IconButton onClick={handleEditButton}>
            <CustomIcon size='xs' type='pen' />
          </IconButton>
        </Stack>
      )}
    </ExplanationMessageStyled>
  );
}
