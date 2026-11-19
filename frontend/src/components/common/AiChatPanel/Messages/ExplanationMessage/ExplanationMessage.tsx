import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useAiStore } from '@/store/aiStore/ai.store';
import { IconButton, Tooltip, Typography } from '@mui/material';
import locales from '@/locales';
import type { ExplanationMessageProps } from '../../types';
import { sanitizeAssistantContent } from '../../utils/assistantContent';
import ChatMarkdown from '../ChatMarkdown/ChatMarkdown';
import { ExplanationMessageStyled, UserMessageEditStyled, UserMessageRowStyled } from './ExplanationMessage.styled';

export default function ExplanationMessage({ message }: ExplanationMessageProps) {
  const isUser = message.role === 'user';

  const handleEditButton = () => {
    useAiStore.getState().beginMessageEdit(message.createdAt, message.content);
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
      dir='auto'
      data-testid={isUser ? 'ai-user-message' : undefined}
      // Only what the user typed keeps its line breaks; markdown has its own.
      sx={
        isUser
          ? { flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55, unicodeBidi: 'plaintext' }
          : { lineHeight: 1.7 }
      }
    >
      {isUser ? displayContent : <ChatMarkdown content={displayContent} />}
    </Typography>
  );

  if (isUser) {
    return (
      <UserMessageRowStyled $isNew={message.isNew}>
        <ExplanationMessageStyled $isUser>
          <UserMessageEditStyled>
            <Tooltip title={locales.edit}>
              <IconButton onClick={handleEditButton} aria-label={locales.edit} data-testid='ai-edit-message'>
                <CustomIcon size='xs' type='pen' />
              </IconButton>
            </Tooltip>
          </UserMessageEditStyled>
          {content}
        </ExplanationMessageStyled>
      </UserMessageRowStyled>
    );
  }

  return <ExplanationMessageStyled $isUser={false}>{content}</ExplanationMessageStyled>;
}
