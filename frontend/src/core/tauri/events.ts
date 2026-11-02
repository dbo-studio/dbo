import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ServerEvent, type MenuActionPayload, type SidecarFailedPayload } from './types';

export const streams = {
  window: {
    onFullScreenChange: async (callback: (isFullScreen: boolean) => void): Promise<UnlistenFn> => {
      const window = getCurrentWindow();
      let last = await window.isFullscreen();
      return window.onResized(() => {
        void window.isFullscreen().then((current) => {
          if (current !== last) {
            last = current;
            callback(current);
          }
        });
      });
    }
  },
  menu: {
    onAction: async (callback: (id: string) => void): Promise<UnlistenFn> => {
      return listen<MenuActionPayload>(ServerEvent.MenuAction, (event) => {
        callback(event.payload.id);
      });
    }
  },
  files: {
    onOpen: async (callback: () => void): Promise<UnlistenFn> => {
      return listen(ServerEvent.OpenFiles, () => callback());
    },

    onDrop: async (callback: (paths: string[]) => void): Promise<UnlistenFn> => {
      return getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type === 'drop') {
          callback(event.payload.paths);
        }
      });
    }
  },
  sidecar: {
    onFailed: async (callback: (reason: string) => void): Promise<UnlistenFn> => {
      return listen<SidecarFailedPayload>(ServerEvent.SidecarFailed, (event) => {
        callback(event.payload.reason);
      });
    }
  }
};
