import type { JSX } from 'react';
import ConfirmModal from '../base/Modal/ConfirmModal/ConfirmModal.tsx';
import SafeModePasswordHost from '../common/SafeModePasswordPrompt/SafeModePasswordHost';
import UpdateDialog from '../common/UpdateDialog/UpdateDialog';

/** App-wide modal hosts shared by the desktop layout and the mobile shell. */
export default function AppHosts(): JSX.Element {
  return (
    <>
      <ConfirmModal />
      <SafeModePasswordHost />
      <UpdateDialog />
    </>
  );
}
