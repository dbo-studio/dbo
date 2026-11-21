import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { JSX } from 'react';
import type { ChatEmptyStateProps } from '../../types';
import { NO_CONNECTION_PROMPTS } from '../../utils/chatPromptSuggestions';
import { EmptyLayoutStyled } from './ChatEmptyState.styled';
import EmptyHeading from './EmptyHeading/EmptyHeading';
import EmptyIllustration from './EmptyIllustration/EmptyIllustration';
import NoProviderState from './NoProviderState/NoProviderState';
import ShortcutsHint from './ShortcutsHint/ShortcutsHint';
import Starters from './Starters/Starters';
import { useChatEmptyState } from './useChatEmptyState';
import WhatsNewTip from './WhatsNewTip/WhatsNewTip';

/** Empty chat: onboarding when no provider, generic help without a connection, contextual starters when ready. */
export default function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps): JSX.Element {
  const { ready, hasConnection, promptKeys } = useChatEmptyState();

  if (!ready) {
    return <NoProviderState />;
  }

  if (!hasConnection) {
    return (
      <EmptyLayoutStyled data-testid='ai-chat-empty'>
        <EmptyHeading
          icon={<EmptyIllustration variant='connection' />}
          title={locales.ai_no_connection_title}
          subtitle={locales.ai_no_connection_subtitle}
        />
        <Starters keys={NO_CONNECTION_PROMPTS} onSelect={onSelectPrompt} />
        <ShortcutsHint />
      </EmptyLayoutStyled>
    );
  }

  return (
    <EmptyLayoutStyled data-testid='ai-chat-empty'>
      <EmptyHeading
        icon={<CustomIcon type='wand_sparkles' size='m' />}
        title={locales.ai_welcome_title}
        subtitle={locales.ai_welcome_subtitle}
      />
      <WhatsNewTip />
      <Starters keys={promptKeys} onSelect={onSelectPrompt} />
      <ShortcutsHint />
    </EmptyLayoutStyled>
  );
}
