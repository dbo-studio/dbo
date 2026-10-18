import { useAiStore } from '@/store/aiStore/ai.store';
import { IDLE_SESSION } from '@/store/aiStore/slices/aiSession.slice';
import type { AiSession } from '@/store/aiStore/types';

/** The open chat's turn state; every chat streams on its own. */
export const useAiSession = (): AiSession =>
  useAiStore((state) => state.sessions[state.currentChat?.id ?? 0] ?? IDLE_SESSION);
