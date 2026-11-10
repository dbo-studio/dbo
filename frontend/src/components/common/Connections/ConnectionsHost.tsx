import { canCreateConnection } from '@/core/auth/permissions';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useEffect } from 'react';
import AddConnection from '../AddConnection/AddConnection';
import EditConnection from '../AddConnection/EditConnection';
import ConnectionPasswordPromptModal from './ConnectionPasswordPrompt/ConnectionPasswordPrompt';
import { useConnectionsList } from './useConnectionsList';

/**
 * Loads the connection list, keeps one selected, and hosts the connection dialogs. It renders
 * nothing itself: the list is shown by the connection switcher, and this must stay mounted for it.
 */
export default function ConnectionsHost(): JSX.Element {
  const { connections } = useConnectionsList();
  const updateUI = useSettingStore((state) => state.updateUI);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAdd = canCreateConnection(mode, user);

  useEffect(() => {
    if (connections?.length === 0 && canAdd) {
      updateUI({ showAddConnection: true, duplicateConnectionId: undefined });
    }
  }, [canAdd, connections, updateUI]);

  return (
    <>
      <AddConnection />
      <EditConnection />
      <ConnectionPasswordPromptModal />
    </>
  );
}
