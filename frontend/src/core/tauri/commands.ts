import { invoke } from './helpers';
import { Command } from './types';

export const commands = {
  getBackendHost: (): Promise<string> => invoke(Command.getBackendHost) as Promise<string>,
  restartBackend: (): Promise<void> => invoke(Command.restartBackend) as Promise<void>,
  takePendingOpenFiles: (): Promise<string[]> => invoke(Command.takePendingOpenFiles) as Promise<string[]>,
  readSqlFile: (path: string): Promise<string> => invoke(Command.readSqlFile, { path }) as Promise<string>
};
