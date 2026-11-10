import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import { useEffect } from 'react';

/**
 * Maps browser / Android hardware back to popping the active tab's stack.
 * A history entry is kept one step ahead so `popstate` fires on back instead of leaving the app.
 */
export const useHardwareBack = (): void => {
  useEffect(() => {
    window.history.pushState({ mobileNav: true }, '');

    const onPopState = (): void => {
      if (useMobileNavStore.getState().pop()) {
        window.history.pushState({ mobileNav: true }, '');
      }
    };

    window.addEventListener('popstate', onPopState);
    return (): void => window.removeEventListener('popstate', onPopState);
  }, []);
};
