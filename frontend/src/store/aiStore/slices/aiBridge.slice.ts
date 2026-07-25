import type { AiBridgeRequest } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiBridgeSlice } from '../types';

export const createAiBridgeSlice: StateCreator<AiBridgeSlice, [['zustand/devtools', never]], [], AiBridgeSlice> = (
  set
) => ({
  bridgeRequest: null,
  setBridgeRequest: (bridgeRequest: AiBridgeRequest | null) => {
    set({ bridgeRequest }, undefined, 'setBridgeRequest');
  }
});
