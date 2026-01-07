import { listen } from '@tauri-apps/api/event';
import { ServerEvent } from './types';

export type SqlFilePayload = {
  path: string;
  name: string;
  content: string;
};

export const streams = {
  window: {
    willEnterFullScreen: (callback: () => void) => {
      listen(ServerEvent.WindowWillEnterFullScreen, () => callback());
    },

    willExitFullScreen: (callback: () => void) => {
      listen(ServerEvent.WindowWillExitFullScreen, () => callback());
    }
  },

  file: {
    onOpenSqlFile: (callback: (payload: SqlFilePayload) => void) => {
      return listen<SqlFilePayload>(ServerEvent.OpenSqlFile, (event) => callback(event.payload));
    }
  }
};
