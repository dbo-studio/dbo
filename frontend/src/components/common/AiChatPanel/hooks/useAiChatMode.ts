import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { AiChatMode, ConnectionType } from '@/types';

const isGuardedConnection = (connection: ConnectionType | undefined): boolean =>
  connection?.safeMode === 'safe' || connection?.safeMode === 'safe_write';

/** Last-used mode, else Ask on Safe Mode–guarded connections and Agent elsewhere. */
export const resolveAiChatMode = (): AiChatMode =>
  useSettingStore.getState().editor.aiChatMode ??
  (isGuardedConnection(useConnectionStore.getState().currentConnection()) ? 'ask' : 'agent');

export const useAiChatMode = (): [AiChatMode, (mode: AiChatMode) => void] => {
  const stored = useSettingStore((state) => state.editor.aiChatMode);
  const guarded = useConnectionStore((state) => isGuardedConnection(state.currentConnection()));
  const readOnly = useConnectionStore((state) => state.currentConnection()?.agentTier === 'read_only');
  const updateEditor = useSettingStore((state) => state.updateEditor);

  // A read-only connection always runs in Ask; the server enforces the same.
  const mode = readOnly ? 'ask' : (stored ?? (guarded ? 'ask' : 'agent'));
  return [mode, (next) => updateEditor({ aiChatMode: next })];
};
