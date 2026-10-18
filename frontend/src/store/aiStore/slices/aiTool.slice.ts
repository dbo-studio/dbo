import type { StateCreator } from 'zustand';
import type { AiReviewDecision, AiToolSlice } from '../types';

const REVIEWS_STORAGE_KEY = 'dbo:ai-reviews';
const MAX_STORED_REVIEWS = 200;

const loadReviews = (): Record<string, AiReviewDecision> => {
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AiReviewDecision>) : {};
  } catch {
    return {};
  }
};

const saveReviews = (reviews: Record<string, AiReviewDecision>): void => {
  try {
    const entries = Object.entries(reviews).slice(-MAX_STORED_REVIEWS);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* storage unavailable: decisions stay in memory */
  }
};

export const createAiToolSlice: StateCreator<AiToolSlice, [['zustand/devtools', never]], [], AiToolSlice> = (set) => ({
  reviews: loadReviews(),
  setReview: (id, decision) => {
    set(
      (state) => {
        const reviews = { ...state.reviews, [id]: decision };
        saveReviews(reviews);
        return { reviews };
      },
      undefined,
      'setReview'
    );
  }
});
