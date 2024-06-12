import { constants } from '@/src/core/constants';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SettingStore, SidebarType } from './types';
import {immer} from "zustand/middleware/immer";

type SettingState = SettingStore;

export const useSettingStore = create<SettingState>()(
  devtools(
      immer((set, get,) => ({
          sidebar: {
              leftWidth: constants.defaultSidebarWidth,
              rightWidth: constants.defaultSidebarWidth,
              showLeft: true,
              showRight: true
          },
          updateSidebar: (sidebar: Partial<SidebarType>) => {
              const oldSidebar = get().sidebar;
              const newSidebar = {...oldSidebar, ...sidebar};
              set({sidebar: newSidebar});
          }
      })),
    { name: 'settings' }
  )
);
