import api from '@/api';
import { storeSafeModePassword } from '@/core/tauri/biometry';
import { confirmSafeModeAction, formatSafeModeReason, getSafeModeError } from '@/core/utils/safeMode';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSafeModePasswordStore } from '@/store/safeModePassword/safeModePassword.store';
import { toast } from 'sonner';

/**
 * Handles Safe Mode API errors. Returns true when the caller should retry with confirmed=true.
 */
export async function resolveSafeModeGate(error: unknown): Promise<boolean> {
  const safeModeError = getSafeModeError(error);
  if (!safeModeError) {
    throw error;
  }

  if (safeModeError.message === 'safe_mode_confirm_required') {
    return confirmSafeModeAction(formatSafeModeReason(safeModeError.data));
  }

  if (safeModeError.message === 'safe_mode_password_required') {
    const connectionId = useConnectionStore.getState().currentConnectionId;
    const connection = useConnectionStore.getState().connections?.find((item) => item.id === Number(connectionId));
    if (!connection) {
      toast.error(locales.safe_mode_blocked_generic);
      return false;
    }

    const result = await useSafeModePasswordStore.getState().request({
      connectionId: connection.id,
      mode: 'unlock'
    });
    if (!result?.password) {
      return false;
    }

    try {
      await api.safeMode.verify(result.password, connection.id);
      void storeSafeModePassword(result.password);
      return true;
    } catch {
      toast.error(locales.safe_mode_password_invalid);
      return false;
    }
  }

  if (safeModeError.message === 'safe_mode_blocked') {
    toast.error(formatSafeModeReason(safeModeError.data));
    return false;
  }

  throw error;
}
