import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { JSX } from 'react';
import { CHAT_PROMPT_ICONS, type ChatPromptKey } from '../../../utils/chatPromptSuggestions';
import { StarterCardStyled, StarterGridStyled } from './Starters.styled';

type StartersProps = {
  keys: ChatPromptKey[];
  onSelect?: (prompt: string) => void;
};

export default function Starters({ keys, onSelect }: StartersProps): JSX.Element {
  return (
    <StarterGridStyled>
      {keys.map((key) => (
        <StarterCardStyled key={key} onClick={() => onSelect?.(locales[key])} data-testid={`ai-starter-${key}`}>
          <CustomIcon type={CHAT_PROMPT_ICONS[key]} size='xs' />
          <span>{locales[key]}</span>
        </StarterCardStyled>
      ))}
    </StarterGridStyled>
  );
}
