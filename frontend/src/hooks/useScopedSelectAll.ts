import { type RefObject, useEffect } from 'react';

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

const isSelectAllHotkey = (event: KeyboardEvent): boolean => {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === 'KeyA';
};

const selectNodeContents = (el: Node): void => {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
};

const selectScopedContents = (root: HTMLElement): void => {
  const preferred = root.querySelector('[data-select-all-root]');
  if (preferred) {
    selectNodeContents(preferred);
    return;
  }

  const skip = root.querySelector('[data-select-all-skip]');
  if (skip && root.lastChild && skip !== root.lastChild) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.setStartAfter(skip);
    range.setEndAfter(root.lastChild);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  selectNodeContents(root);
};

export function useScopedSelectAll(containerRef: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isSelectAllHotkey(event) || isEditableTarget(event.target)) {
        return;
      }

      const root = containerRef.current;
      if (!root) {
        return;
      }

      event.preventDefault();
      selectScopedContents(root);
    };

    document.addEventListener('keydown', onKeyDown);
    return (): void => document.removeEventListener('keydown', onKeyDown);
  }, [containerRef, enabled]);
}
