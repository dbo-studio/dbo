import { useEffect } from 'react';

// Esc must never exit fullscreen app-wide; it still reaches handlers (modals, editors) as a normal key.
// shortcut: preventDefault + Keyboard Lock only; a native OS fullscreen exit that ignores both needs a Rust-side fix.
export function useEscapeFullscreenGuard(): void {
  useEffect(() => {
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
  }, []);
}
