import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { ServerEvent, type MenuActionPayload, type SidecarFailedPayload } from './types';

export const streams = {
  window: {
    willEnterFullScreen: (callback: () => void) => {
      void listen(ServerEvent.WindowWillEnterFullScreen, () => callback());
    },

    willExitFullScreen: (callback: () => void) => {
      void listen(ServerEvent.WindowWillExitFullScreen, () => callback());
    }
  },
  menu: {
    onAction: async (callback: (id: string) => void): Promise<UnlistenFn> => {
      return listen<MenuActionPayload>(ServerEvent.MenuAction, (event) => {
        callback(event.payload.id);
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
