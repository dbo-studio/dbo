import type { JSX } from 'react';
import CommandPalette from '../common/CommandPalette/CommandPalette';
import ConfirmModal from '../base/Modal/ConfirmModal/ConfirmModal.tsx';
import JobResultHost from '../common/JobProgressModal/JobResultHost';
import DashboardNameDialog from '../common/DashboardNameDialog/DashboardNameDialog';
import SafeModePasswordHost from '../common/SafeModePasswordPrompt/SafeModePasswordHost';
import TransferHost from '../common/TransferHost/TransferHost';
import UpdateDialog from '../common/UpdateDialog/UpdateDialog';

/** App-wide modal hosts shared by the desktop layout and the mobile shell. */
export default function AppHosts(): JSX.Element {
  return (
    <>
      <ConfirmModal />
      <DashboardNameDialog />
      <JobResultHost />
      <SafeModePasswordHost />
      <CommandPalette />
      <TransferHost />
      <UpdateDialog />
    </>
  );
}
