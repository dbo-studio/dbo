import { constants } from '@/core/constants';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { SettingStore, SidebarType, TitleBarType } from './types';

type SettingState = SettingStore;

export const useSettingStore: UseBoundStore<StoreApi<SettingState>> = create<SettingState>()(
  devtools(
    persist(
      (set, get) => ({
        sidebar: {
          leftWidth: constants.defaultSidebarWidth,
          rightWidth: constants.defaultSidebarWidth,
          showLeft: true,
          showRight: false
        },
        isDark: false,
        debug: false,
        version: '',
        showAddConnection: false,
        showEditConnection: false,
        showQuickLookEditor: false,
        scrollToBottom: true,
        showSettings: {
          open: false,
          tab: 0
        },
        enableEditorAi: false,
        titleBar: {
          paddingLeft: 0,
          paddingTop: 0,
          onHeaderAreaClick: () => {}
        },
        updateVersion: (version: string): void => {
          set({ version: version }, undefined, 'updateVersion');
        },
        toggleDebug: (debug?: boolean): void => {
          set({ debug: debug !== undefined ? debug : !get().debug }, undefined, 'toggleDebug');
        },
        updateSidebar: (sidebar: Partial<SidebarType>): void => {
          const oldSidebar = get().sidebar;
          const newSidebar = { ...oldSidebar, ...sidebar };
          set({ sidebar: newSidebar }, undefined, 'updateSidebar');
        },
        toggleIsDark: (isDark?: boolean): void => {
          set({ isDark: isDark !== undefined ? isDark : !get().isDark }, undefined, 'toggleIsDark');
        },
        toggleShowAddConnection: (show?: boolean): void => {
          set(
            { showAddConnection: show !== undefined ? show : !get().showAddConnection },
            undefined,
            'toggleShowAddConnection'
          );
        },
        toggleShowEditConnection: (show?: boolean | number): void => {
          set(
            { showEditConnection: show !== undefined ? show : !get().showEditConnection },
            undefined,
            'toggleShowEditConnection'
          );
        },
        toggleShowQuickLookEditor: (show?: boolean): void => {
          set(
            { showQuickLookEditor: show !== undefined ? show : !get().showQuickLookEditor },
            undefined,
            'toggleShowQuickLookEditor'
          );
        },
        toggleShowSettings: (show?: boolean, tab?: number): void => {
          show = show !== undefined ? show : !get().showSettings.open;
          tab = tab !== undefined ? tab : 0;

          set({ showSettings: { open: show, tab: tab } }, undefined, 'toggleShowSettings');
        },
        toggleScrollToBottom: (scroll?: boolean): void => {
          set(
            { scrollToBottom: scroll !== undefined ? scroll : !get().scrollToBottom },
            undefined,
            'toggleScrollToBottom'
          );
        },
        toggleEnableEditorAi: (enable?: boolean): void => {
          set(
            { enableEditorAi: enable !== undefined ? enable : !get().enableEditorAi },
            undefined,
            'toggleEnableEditorAi'
          );
        },
        updateTitleBar: (titleBar: Partial<TitleBarType>): void => {
          const newTitleBar = { ...get().titleBar, ...titleBar };
          set({ titleBar: newTitleBar }, undefined, 'updateTitleBar');
        }
      }),
      { name: 'settings' }
    ),
    { name: 'settings' }
  )
);
