import { constants } from '@/core/constants';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { SettingStore, SidebarType } from './types';

type SettingState = SettingStore;

export const useSettingStore = create<SettingState>()(
  devtools(
    immer((set, get) => ({
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
    })),
    { name: 'settings' }
  )
);
