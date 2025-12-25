import { InvokeArgs, invoke as invokeTauri } from '@tauri-apps/api/core';
import { Command } from './types';

export const invoke = <T extends InvokeArgs, V = unknown>(cmd: Command, args?: T) =>
  invokeTauri(cmd, args) as Promise<V>;
