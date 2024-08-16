import { constants } from '@/core/constants';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { SettingStore, SidebarType } from './types';

type SettingState = SettingStore;

export const useSettingStore = create<SettingState>()(
  devtools(
    persist(
      immer((set, get) => ({
        sidebar: {
          leftWidth: constants.defaultSidebarWidth,
          rightWidth: constants.defaultSidebarWidth,
          showLeft: true,
          showRight: true
        },
        isDark: false,
        updateSidebar: (sidebar: Partial<SidebarType>) => {
          const oldSidebar = get().sidebar;
          const newSidebar = { ...oldSidebar, ...sidebar };
          set({ sidebar: newSidebar });
        },
        updateIsDark: (isDark: undefined | boolean) => {
          if (isDark !== undefined) {
            set({ isDark });
          } else {
            set({ isDark: !get().isDark });
          }
        }
      })),
      { name: 'settings' }
    ),
    { name: 'settings' }
  )
);
