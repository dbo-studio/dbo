import type { DashboardType } from '@/api/dashboard/types';
import type { JSX } from 'react';
import ShareForm from './ShareForm/ShareForm';

/** Links that show a board read-only to people without an account: make one, set its expiry and password, revoke it. */
export default function ShareDialog({
  board,
  open,
  onClose
}: {
  board: DashboardType;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  // Remounts per open so a link shown once is not kept around.
  return <>{open && <ShareForm board={board} onClose={onClose} />}</>;
}
