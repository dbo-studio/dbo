import { listen } from "@tauri-apps/api/event";
import { ServerEvent } from "./types";

export const streams = {
  window: {
    willEnterFullScreen: (callback: () => void) => {
      listen(ServerEvent.WindowWillEnterFullScreen, () => callback());
    },

    willExitFullScreen: (callback: () => void) => {
      listen(ServerEvent.WindowWillExitFullScreen, () => callback());
    },
  },
};
