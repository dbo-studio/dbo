import { changeUrl } from '@/core/api';
import { commands, streams } from '@/core/tauri';
import { tools } from '@/core/utils';
import { switchToDesktopShortcuts } from '@/core/utils/shortcuts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { platform } from '@tauri-apps/plugin-os';
import axios from 'axios';
import { useEffect, useState } from 'react';

const BACKEND_HEALTH_CHECK_CONFIG = {
  maxAttempts: 60,
  intervalMs: 500,
  timeout: 2000
} as const;

const TITLE_BAR_CONFIG = {
  normal: {
    paddingLeft: 80,
    paddingTop: 8
  },
  fullScreen: {
    paddingLeft: 16,
    paddingTop: 8
  }
} as const;

export const useSetupDesktop = (): boolean => {
  const [loaded, setLoaded] = useState(false);
  const reset = useTabStore((state) => state.reset);

  useEffect(() => {
    const initializeDesktop = async (): Promise<void> => {
      try {
        const isTauri = await tools.isTauri();
        if (!isTauri) {
          setLoaded(true);
          return;
        }

        reset();
        await setup();
        setLoaded(true);
      } catch (error) {
        console.error('Error during desktop setup:', error);
        setLoaded(true);
      }
    };

    initializeDesktop();
  }, [reset]);

  return loaded;
};

const setup = async (): Promise<void> => {
  disableDefaultContextMenu();
  await setupTitleBar();
  await setupBackend();
};

const waitForBackendReady = async (baseUrl: string): Promise<void> => {
  const tempApi = axios.create({
    baseURL: baseUrl,
    timeout: BACKEND_HEALTH_CHECK_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  for (let attempt = 1; attempt <= BACKEND_HEALTH_CHECK_CONFIG.maxAttempts; attempt++) {
    try {
      await tempApi.get('/config');
      return;
    } catch (error) {
      if (attempt < BACKEND_HEALTH_CHECK_CONFIG.maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, BACKEND_HEALTH_CHECK_CONFIG.intervalMs));
      } else {
        throw new Error('Backend failed to start within the expected time');
      }
    }
  }
};

const setupBackend = async (): Promise<void> => {
  const backendHost = await commands.getBackendHost();
  if (!backendHost || backendHost.trim() === '') {
    console.error('Backend host is empty, cannot setup backend');
    throw new Error('Backend host is not available');
  }

  changeUrl(backendHost);
  await waitForBackendReady(backendHost);
  switchToDesktopShortcuts();
};

const disableDefaultContextMenu = (): void => {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  const preventContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  const preventSelectStart = (e: Event): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    e.preventDefault();
  };

  document.addEventListener('contextmenu', preventContextMenu, { capture: true });
  document.addEventListener('selectstart', preventSelectStart, { capture: true });
};

const createHeaderAreaClickHandler = async (): Promise<void> => {
  const window = getCurrentWebviewWindow();
  await window.startDragging();
};

const setupTitleBar = async (): Promise<void> => {
  const updateUI = useSettingStore.getState().updateUI;
  const currentPlatform = await platform();

  if (currentPlatform !== 'macos') {
    return;
  }

  const updateTitleBar = (config: typeof TITLE_BAR_CONFIG.normal | typeof TITLE_BAR_CONFIG.fullScreen): void => {
    updateUI({
      titleBar: {
        paddingLeft: config.paddingLeft,
        paddingTop: config.paddingTop,
        onHeaderAreaClick: createHeaderAreaClickHandler
      }
    });
  };

  updateTitleBar(TITLE_BAR_CONFIG.normal);

  streams.window.willEnterFullScreen(() => {
    updateTitleBar(TITLE_BAR_CONFIG.fullScreen);
  });

  streams.window.willExitFullScreen(() => {
    updateTitleBar(TITLE_BAR_CONFIG.normal);
  });
};
