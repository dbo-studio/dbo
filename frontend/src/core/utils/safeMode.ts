import axios from 'axios';

import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';

export type SafeModeErrorData = {
  class?: string;
  reason?: string;
  requiresConfirm?: boolean;
  requiresPassword?: boolean;
  canUnlock?: boolean;
  safeMode?: string;
  unlocked?: boolean;
};

export function getSafeModeError(error: unknown): { message: string; data: SafeModeErrorData } | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) {
    return null;
  }

  const message = String(error.response.data?.message ?? '');
  if (
    message !== 'safe_mode_blocked' &&
    message !== 'safe_mode_confirm_required' &&
    message !== 'safe_mode_password_required'
  ) {
    return null;
  }

  return {
    message,
    data: (error.response.data?.data ?? {}) as SafeModeErrorData
  };
}

export function confirmSafeModeAction(description: string, confirmLabel?: string): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmModalStore.getState().danger(
      locales.safe_mode_confirm_title,
      description,
      () => resolve(true),
      () => resolve(false),
      confirmLabel ?? locales.safe_mode_run_anyway
    );
  });
}

export function formatSafeModeReason(data: SafeModeErrorData): string {
  if (data.reason) {
    return data.reason;
  }
  return locales.safe_mode_blocked_generic;
}
