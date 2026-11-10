import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { MobileNavStore, MobileTab } from './types';

const initialStacks: Record<MobileTab, []> = {
  explore: [],
  query: [],
  ai: []
};

/**
 * Mobile shell navigation. Each bottom tab owns a stack of pushed screens on top of its root screen;
 * an empty stack shows the root.
 */
export const useMobileNavStore: UseBoundStore<StoreApi<MobileNavStore>> = create<MobileNavStore>()(
  devtools(
    (set, get) => ({
      activeTab: 'explore',
      stacks: initialStacks,
      connectionsOpen: false,
      setConnectionsOpen: (open: boolean): void => set({ connectionsOpen: open }, undefined, 'setConnectionsOpen'),
      setActiveTab: (tab: MobileTab): void => set({ activeTab: tab }, undefined, 'setActiveTab'),
      push: (screen): void => {
        const { activeTab, stacks } = get();
        set({ stacks: { ...stacks, [activeTab]: [...stacks[activeTab], screen] } }, undefined, 'push');
      },
      pop: (): boolean => {
        const { activeTab, stacks } = get();
        if (stacks[activeTab].length === 0) {
          return false;
        }
        set({ stacks: { ...stacks, [activeTab]: stacks[activeTab].slice(0, -1) } }, undefined, 'pop');
        return true;
      },
      resetTab: (tab: MobileTab): void => {
        set({ stacks: { ...get().stacks, [tab]: [] } }, undefined, 'resetTab');
      }
    }),
    { name: 'mobile_nav' }
  )
);
