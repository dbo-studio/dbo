import { invoke } from './helpers';
import { Command } from './types';

export const commands = {
  getBackendHost: (): Promise<string> => invoke(Command.getBackendHost) as Promise<string>,
  restartBackend: (): Promise<void> => invoke(Command.restartBackend) as Promise<void>
};
