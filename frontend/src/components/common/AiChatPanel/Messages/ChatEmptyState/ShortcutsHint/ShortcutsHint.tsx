import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import type { JSX } from 'react';
import { KbdStyled, ShortcutStyled, ShortcutsRowStyled } from './ShortcutsHint.styled';

export default function ShortcutsHint(): JSX.Element {
  const mod = tools.isMac() ? '⌘' : 'Ctrl';
  const keys: [string, string][] = [
    ['Enter', locales.ai_shortcut_send],
    ['Esc', locales.ai_shortcut_stop],
    [`${mod} L`, locales.ai_shortcut_focus]
  ];

  return (
    <ShortcutsRowStyled data-testid='ai-shortcuts-hint'>
      {keys.map(([key, label]) => (
        <ShortcutStyled key={key} variant='caption' color='textSubdued'>
          <KbdStyled>{key}</KbdStyled>
          {label}
        </ShortcutStyled>
      ))}
    </ShortcutsRowStyled>
  );
}
