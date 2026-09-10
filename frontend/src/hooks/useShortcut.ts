import type { ShortcutType } from '@/types';
import { useEffect } from 'react';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }

  return target.isContentEditable;
};

const hasChordModifier = (event: KeyboardEvent): boolean => {
  return event.altKey || event.ctrlKey || event.metaKey;
};

export const useShortcut = (shortcut: ShortcutType, callback: () => void): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!shortcut.shortcut(event)) {
        return;
      }

      // Don't steal bare keys (e.g. Escape) from inputs, except cancelQuery.
      if (isEditableTarget(event.target) && !hasChordModifier(event) && shortcut.id !== 'cancelQuery') {
        return;
      }

      event.preventDefault();
      callback();
    };

    window.addEventListener('keydown', handleKeyDown);

    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback, shortcut]);
};
