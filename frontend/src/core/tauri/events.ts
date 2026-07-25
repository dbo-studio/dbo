import { listen } from '@tauri-apps/api/event';
import { ServerEvent } from './types';

export const streams = {
  window: {
    willEnterFullScreen: (callback: () => void) => {
      void listen(ServerEvent.WindowWillEnterFullScreen, () => callback());
    },

    willExitFullScreen: (callback: () => void) => {
      void listen(ServerEvent.WindowWillExitFullScreen, () => callback());
    }
  }
};
