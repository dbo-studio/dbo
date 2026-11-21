import { useAiStore } from '@/store/aiStore/ai.store';
import { IDLE_SESSION } from '@/store/aiStore/slices/aiSession.slice';

/** Only used while a thinking block is streaming; keeps history rows off the live session. */
export function useLiveThinkingDurationMs(): number | undefined {
  return useAiStore(
    (state) => (state.sessions[state.currentChat?.id ?? 0] ?? IDLE_SESSION).streaming.thinkingDurationMs
  );
}