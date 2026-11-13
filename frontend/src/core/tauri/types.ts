export enum Command {
  getBackendHost = 'get_backend_host',
  restartBackend = 'restart_backend',
  takePendingOpenFiles = 'take_pending_open_files',
  readSqlFile = 'read_sql_file',
  setWindowToolbar = 'set_window_toolbar'
}

export enum ServerEvent {
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
