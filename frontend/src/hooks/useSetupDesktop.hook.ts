import { changeUrl } from '@/core/api';
import { commands, streams } from '@/core/tauri';
import { tools } from '@/core/utils';
import { switchToDesktopShortcuts } from '@/core/utils/shortcuts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { platform } from '@tauri-apps/plugin-os';
import { useEffect, useState } from 'react';

export const useSetupDesktop = (): boolean => {
  const [loaded, setLoaded] = useState(false);
  const reset = useTabStore((state) => state.reset);

  useEffect(() => {
    tools
      .isTauri()
      .then((e) => {
        if (!e) {
          setLoaded(true);
          return;
        }
        reset();
        setup().then(() => {
          setLoaded(true);
        });
      })
      .catch((e) => {
        console.log('=>(useSetupDesktop.hook.ts:28) e', e);
        setLoaded(true);
      });
  }, []);

  return loaded;
};

const setup = async (): Promise<void> => {
  disableDefaultContextMenu();
  await setupTitleBar();
  await setupBackend();
};

const setupBackend = async (): Promise<void> => {
  const response = await commands.getBackendHost();
  if (response === '') {
    alert('cant found empty port!');
    return;
  }

  changeUrl(response as string);
  changeUrl(response as string);
  switchToDesktopShortcuts();
};

const disableDefaultContextMenu = (): void => {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      return false;
    },
    { capture: true }
  );

  document.addEventListener(
    'selectstart',
    (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      e.preventDefault();
      return false;
    },
    { capture: true }
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        return;
      }
    },
    { capture: true }
  );
};

const setupTitleBar = async (): Promise<void> => {
  const updateTitleBar = useSettingStore.getState().updateTitleBar;
  const p = platform();

  if (p !== 'macos') {
    return;
  }

  updateTitleBar({
    paddingLeft: 80,
    paddingTop: 8,
    onHeaderAreaClick: async () => {
      const window = getCurrentWebviewWindow();
      await window.startDragging();
    }
  });

  streams.window.willEnterFullScreen(() => {
    updateTitleBar({
      paddingLeft: 16,
      paddingTop: 8
    });
  });

  streams.window.willExitFullScreen(() => {
    updateTitleBar({
      paddingLeft: 80,
      paddingTop: 8
    });
  });
};
