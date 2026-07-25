import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useAiStore } from '@/store/aiStore/ai.store';
import { IconButton, Tooltip, Typography } from '@mui/material';
import locales from '@/locales';
import type { ExplanationMessageProps } from '../../types';
import { sanitizeAssistantContent } from '../../utils/assistantContent';
import ChatMarkdown from '../ChatMarkdown/ChatMarkdown';
import { ExplanationMessageStyled, UserMessageActionsStyled, UserMessageRowStyled } from './ExplanationMessage.styled';

export default function ExplanationMessage({ message }: ExplanationMessageProps) {
  const isUser = message.role === 'user';

  const handleEditButton = () => {
    const context = useAiStore.getState().context;
    const updateContext = useAiStore.getState().updateContext;
    const toggleMessageEdit = useAiStore.getState().toggleMessageEdit;

    updateContext({
      ...context,
      input: message.content
    });

    toggleMessageEdit();
  };

  const displayContent = isUser
    ? message.content
    : sanitizeAssistantContent(message.content, locales.ai_tool_response_pending);

  if (!isUser && !displayContent.trim()) {
    return null;
  }

  const content = (
    <Typography
      variant='body2'
      component='div'
      sx={{
        whiteSpace: 'pre-wrap',
        ...(isUser ? { lineHeight: 1.55 } : undefined)
      }}
    >
      {isUser ? displayContent : <ChatMarkdown content={displayContent} />}
    </Typography>
  );

  if (isUser) {
    return (
      <UserMessageRowStyled>
        <UserMessageActionsStyled className='user-message-actions'>
          <Tooltip title={locales.edit}>
            <IconButton size='small' onClick={handleEditButton}>
              <CustomIcon size='xs' type='pen' />
            </IconButton>
          </Tooltip>
        </UserMessageActionsStyled>
        <ExplanationMessageStyled $isUser>{content}</ExplanationMessageStyled>
      </UserMessageRowStyled>
    );
  }

  return <ExplanationMessageStyled $isUser={false}>{content}</ExplanationMessageStyled>;
}
