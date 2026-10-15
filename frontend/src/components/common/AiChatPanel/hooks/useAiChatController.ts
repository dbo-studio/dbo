import { createContext, use } from 'react';
import type { useAiChat } from './useAiChat';

export type AiChatController = ReturnType<typeof useAiChat>;

export const AiChatControllerContext = createContext<AiChatController | null>(null);

/** The app-wide chat controller; every AI surface (side panel, agent workspace) drives the same stream. */
export const useAiChatController = (): AiChatController => {
  const controller = use(AiChatControllerContext);
  if (!controller) {
    throw new Error('useAiChatController must be used inside AiChatProvider');
  }
  return controller;
};
