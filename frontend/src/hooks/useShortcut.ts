import { ShortcutType } from '@/src/types';
import { useEffect } from 'react';

export const useShortcut = (shortcut: ShortcutType, callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shortcut.shortcut(event)) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback, shortcut]);
};
