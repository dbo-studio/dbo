export enum Command {
  getBackendHost = 'get_backend_host',
  restartBackend = 'restart_backend'
}

export enum ServerEvent {
  WindowWillEnterFullScreen = 'will-enter-fullscreen',
  WindowWillExitFullScreen = 'will-exit-fullscreen',
  MenuAction = 'menu://action',
  SidecarFailed = 'sidecar://failed'
}

export type MenuActionPayload = {
  id: string;
};

export type SidecarFailedPayload = {
  reason: string;
};
