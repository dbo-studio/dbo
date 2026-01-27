import { constants } from '@/core/constants';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { EditorSettings, GeneralSettings, SettingStore, ThemeSettings, UISettings } from './types';
import { getDefaultTheme } from '@/core/theme/themeRegistry';

type SettingState = SettingStore;

export const useSettingStore: UseBoundStore<StoreApi<SettingState>> = create<SettingState>()(
  devtools(
    persist(
      (set, get) => ({
        ui: {
          sidebar: {
            leftWidth: constants.defaultSidebarWidth,
            rightWidth: constants.defaultSidebarWidth,
            showLeft: true,
            showRight: false
          },
          showAddConnection: false,
          showEditConnection: false,
          showQuickLookEditor: false,
          showSettings: {
            open: false,
            tab: 0
          },
          titleBar: {
            paddingLeft: 16,
            paddingTop: 8,
            onHeaderAreaClick: () => {}
          }
        },
        theme: {
          isDark: false,
          appFont: 'Roboto',
          editorTheme: 'github-light',
          editorFontSize: 14,
          themeName: getDefaultTheme()
        },
        editor: {
          enableEditorAi: false,
          scrollToBottom: false
        },
        general: {
          debug: false,
          enableErrorReporting: false,
          enableAnalytics: true,
          ignoredRelease: '',
          logsPath: '',
          version: '',
          release: undefined
        },
        setup: {
          hasCompletedSetup: false
        },
        updateUI: (ui: Partial<UISettings>): void => {
          const oldUI = get().ui;
          const newUI = { ...oldUI, ...ui };
          set({ ui: newUI }, undefined, 'updateUI');
        },
        updateTheme: (theme: Partial<ThemeSettings>): void => {
          const oldTheme = get().theme;
          const newTheme = { ...oldTheme, ...theme };
          set({ theme: newTheme }, undefined, 'updateTheme');
        },
        updateEditor: (editor: Partial<EditorSettings>): void => {
          const oldEditor = get().editor;
          const newEditor = { ...oldEditor, ...editor };
          set({ editor: newEditor }, undefined, 'updateEditor');
        },
        updateGeneral: (general: Partial<GeneralSettings>): void => {
          const oldGeneral = get().general;
          const newGeneral = { ...oldGeneral, ...general };
          set({ general: newGeneral }, undefined, 'updateGeneral');
        },
        completeSetup: (): void => {
          set({ setup: { hasCompletedSetup: true } }, undefined, 'completeSetup');
        }
      }),
      { name: 'settings' }
    ),
    { name: 'settings' }
  )
);