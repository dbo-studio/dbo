export enum Command {
  getBackendHost = 'get_backend_host',
  restartBackend = 'restart_backend',
  takePendingOpenFiles = 'take_pending_open_files',
  readSqlFile = 'read_sql_file'
}

export enum ServerEvent {
  WindowWillEnterFullScreen = 'will-enter-fullscreen',
  WindowWillExitFullScreen = 'will-exit-fullscreen',
  MenuAction = 'menu://action',
  OpenFiles = 'file://open',
  SidecarFailed = 'sidecar://failed'
}

export type MenuActionPayload = {
  id: string;
};

export type SidecarFailedPayload = {
  reason: string;
};
