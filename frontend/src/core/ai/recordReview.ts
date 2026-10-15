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

/**
 * Claims a permission card before its write runs, so a double click or a stale
 * tab cannot run the statement twice. Resolves false when the server says the
 * card was already reviewed (409) or the claim could not be made.
 */
export const claimReview = async (id: string): Promise<boolean> => {
  const chatId = useAiStore.getState().currentChat?.id;
  if (!chatId) return false;

  try {
    await reviewCard(chatId, { id, decision: 'confirmed' });
    return true;
  } catch {
    return false;
  }
};

/** Gives a claim back when the write did not run (failed, cancelled), so the card can be confirmed again. */
export const releaseReview = (id: string): void => {
  const chatId = useAiStore.getState().currentChat?.id;
  if (chatId) {
    void reviewCard(chatId, { id, decision: 'pending' }).catch(() => undefined);
  }
};
