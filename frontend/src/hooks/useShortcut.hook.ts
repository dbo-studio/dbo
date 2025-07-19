import type { ShortcutType } from '@/types';
import { useEffect } from 'react';

export const useShortcut = (shortcut: ShortcutType, callback: () => void): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (shortcut.shortcut(event)) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback, shortcut]);
};
