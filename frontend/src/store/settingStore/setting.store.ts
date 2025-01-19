import {constants} from '@/core/constants';
import {create} from 'zustand';
import {devtools, persist} from 'zustand/middleware';
import type {SettingStore, SidebarType} from './types';

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
        isDark: false,
        debug: false,
        updateDebug: (debug: boolean) => {
          set({ debug });
        },
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
      }),
      { name: 'settings' }
    ),
    { name: 'settings' }
  )
);
