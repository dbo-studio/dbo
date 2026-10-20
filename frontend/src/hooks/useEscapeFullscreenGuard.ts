import { useEffect } from 'react';

// While a modal is open, Esc must close it, not exit fullscreen.
// shortcut: preventDefault + Keyboard Lock only; a native OS fullscreen exit that ignores both needs a Rust-side fix.
export function useModalEscapeGuard(open: boolean): void {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const keyboard = (
      navigator as Navigator & { keyboard?: { lock?: (keys: string[]) => Promise<void>; unlock?: () => void } }
    ).keyboard;
    void keyboard?.lock?.(['Escape']).catch(() => undefined);
    return (): void => {
      window.removeEventListener('keydown', onKeyDown, true);
      keyboard?.unlock?.();
    };
  }, [open]);
}
