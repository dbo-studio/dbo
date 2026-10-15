import { reviewCard } from '@/api/aiChat';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiReviewDecision } from '@/store/aiStore/types';

/**
 * Stores the user's decision on a diagram_diff / permission card locally and on
 * the server, so the card is not offered again after a reload or on another device.
 */
export const recordReview = (id: string, decision: AiReviewDecision): void => {
  useAiStore.getState().setReview(id, decision);

  const chatId = useAiStore.getState().currentChat?.id;
  if (chatId) {
    void reviewCard(chatId, { id, decision }).catch(() => undefined);
  }
};
