import type { JSX } from 'react';
import ConfirmModal from '../base/Modal/ConfirmModal/ConfirmModal.tsx';
import BackupConsole from '../common/BackupConsole/BackupConsole';
import BackupFailureWatcher from '../common/BackupModal/BackupFailureWatcher';
import BackupModal from '../common/BackupModal/BackupModal';
import SafeModePasswordHost from '../common/SafeModePasswordPrompt/SafeModePasswordHost';
import UpdateDialog from '../common/UpdateDialog/UpdateDialog';

/** App-wide modal hosts shared by the desktop layout and the mobile shell. */
export default function AppHosts(): JSX.Element {
  return (
    <>
      <ConfirmModal />
      <SafeModePasswordHost />
      <BackupModal />
      <BackupConsole />
      <BackupFailureWatcher />
      <UpdateDialog />
    </>
  );
}
