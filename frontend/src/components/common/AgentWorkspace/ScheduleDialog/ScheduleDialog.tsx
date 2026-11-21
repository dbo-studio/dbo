import type { DashboardType } from '@/api/dashboard/types';
import type { JSX } from 'react';
import ScheduleForm from './ScheduleForm/ScheduleForm';

/** Schedules that send a board's reports by email or to a webhook: a CSV per report, on a timetable. */
export default function ScheduleDialog({
  board,
  open,
  onClose
}: {
  board: DashboardType;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  return <>{open && <ScheduleForm board={board} onClose={onClose} />}</>;
}