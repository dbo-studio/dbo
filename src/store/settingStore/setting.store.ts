import { constants } from '@/src/core/constants';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { SettingStore, SidebarType } from './types';

type SettingState = SettingStore;

export const useSettingStore = create<SettingState>()(
  devtools(
    persist(
      (set, get) => ({
        sidebar: {
          leftWidth: constants.defaultSidebarWidth,
          rightWidth: constants.defaultSidebarWidth,
          showLeft: true,
          showRight: true
        },
        updateSidebar: (sidebar: Partial<SidebarType>) => {
          const oldSidebar = get().sidebar;
          const newSidebar = { ...oldSidebar, ...sidebar };
          set({ sidebar: newSidebar });
        }
      }),
      { name: 'settings' }
    )
  )
);
