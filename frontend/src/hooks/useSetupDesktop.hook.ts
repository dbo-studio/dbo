import { changeUrl } from '@/core/api';
import { commands, streams } from '@/core/tauri';
import { tools } from '@/core/utils';
import { switchToDesktopShortcuts } from '@/core/utils/shortcuts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { platform } from '@tauri-apps/plugin-os';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

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

export type DesktopBootState = {
  ready: boolean;
  status: 'idle' | 'starting' | 'error';
  errorMessage: string | null;
  retry: () => void;
};

export const useSetupDesktop = (): DesktopBootState => {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<DesktopBootState['status']>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const reset = useTabStore((state) => state.reset);
  const retryTokenRef = useRef(0);
  const cancelledRef = useRef(false);

  const runSetup = useCallback(async (): Promise<void> => {
    const token = ++retryTokenRef.current;
    cancelledRef.current = false;

    try {
      const isTauri = await tools.isTauri();
      if (!isTauri) {
        setReady(true);
        setStatus('idle');
        setErrorMessage(null);
        return;
      }

      setReady(false);
      setStatus('starting');
      setErrorMessage(null);
      reset();
      await setup();

      if (token !== retryTokenRef.current || cancelledRef.current) {
        return;
      }

      setReady(true);
      setStatus('idle');
    } catch (error) {
      if (token !== retryTokenRef.current || cancelledRef.current) {
        return;
      }

      console.error('Error during desktop setup:', error);
      const message = error instanceof Error ? error.message : 'Backend failed to start within the expected time';
      setErrorMessage(message);
      setStatus('error');
      setReady(false);
    }
  }, [reset]);

  useEffect(() => {
    void runSetup();

    return () => {
      cancelledRef.current = true;
    };
  }, [runSetup]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void (async () => {
      if (!(await tools.isTauri())) {
        return;
      }

      unlisten = await streams.sidecar.onFailed((reason) => {
        setErrorMessage(reason || 'Sidecar terminated unexpectedly');
        setStatus('error');
        setReady(false);
      });
    })();

    return () => {
      unlisten?.();
    };
  }, []);

  const retry = useCallback((): void => {
    void (async () => {
      try {
        if (await tools.isTauri()) {
          await commands.restartBackend();
        }
      } catch (error) {
        console.error('Failed to restart backend:', error);
      }
      void runSetup();
    })();
  }, [runSetup]);

  return {
    ready,
    status,
    errorMessage,
    retry
  };
};

const setup = async (): Promise<void> => {
  disableDefaultContextMenu();
  setupTitleBar();
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
    } catch (err) {
      if (attempt < BACKEND_HEALTH_CHECK_CONFIG.maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, BACKEND_HEALTH_CHECK_CONFIG.intervalMs));
      } else {
        const error = new Error('Backend failed to start within the expected time') as Error & {
          cause: unknown;
        };
        error.cause = err;
        throw error;
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
  if (import.meta.env.DEV) {
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

const createHeaderAreaClickHandler = (event: MouseEvent): void => {
  if (event.button !== 0) {
    return;
  }

  const window = getCurrentWebviewWindow();
  // Native macOS titlebar: double-click toggles zoom; single-click starts drag.
  if (event.detail === 2) {
    void window.toggleMaximize().catch((e) => console.debug('toggleMaximize failed', e));
    return;
  }

  void window.startDragging().catch((e) => console.debug('startDragging failed', e));
};

const setupTitleBar = (): void => {
  const updateUI = useSettingStore.getState().updateUI;
  const currentPlatform = platform();

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
