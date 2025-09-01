import { constants } from '@/core/constants';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { SettingStore, SidebarType } from './types';

type SettingState = SettingStore;

export const useSettingStore: UseBoundStore<StoreApi<SettingState>> = create<SettingState>()(
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
        showAddConnection: false,
        showEditConnection: false,
        showQuickLookEditor: false,
        scrollToBottom: true,
        showSettings: false,
        enableEditorAi: false,
        toggleDebug: (debug?: boolean): void => {
          set({ debug: debug !== undefined ? debug : !get().debug });
        },
        updateSidebar: (sidebar: Partial<SidebarType>): void => {
          const oldSidebar = get().sidebar;
          const newSidebar = { ...oldSidebar, ...sidebar };
          set({ sidebar: newSidebar });
        },
        toggleIsDark: (isDark?: boolean): void => {
          set({ isDark: isDark !== undefined ? isDark : !get().isDark });
        },
        toggleShowAddConnection: (show?: boolean): void => {
          set({ showAddConnection: show !== undefined ? show : !get().showAddConnection });
        },
        toggleShowEditConnection: (show?: boolean | number): void => {
          set({ showEditConnection: show !== undefined ? show : !get().showEditConnection });
        },
        toggleShowQuickLookEditor: (show?: boolean): void => {
          set({ showQuickLookEditor: show !== undefined ? show : !get().showQuickLookEditor });
        },
        toggleShowSettings: (show?: boolean): void => {
          set({ showSettings: show !== undefined ? show : !get().showSettings });
        },
        toggleScrollToBottom: (scroll?: boolean): void => {
          set({ scrollToBottom: scroll !== undefined ? scroll : !get().scrollToBottom });
        },
        toggleEnableEditorAi: (enable?: boolean): void => {
          set({ enableEditorAi: enable !== undefined ? enable : !get().enableEditorAi });
        }
      }),
      { name: 'settings' }
    ),
    { name: 'settings' }
  )
);
