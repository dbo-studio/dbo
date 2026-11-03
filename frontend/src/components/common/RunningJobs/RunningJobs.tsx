import ProgressBar from '@/components/base/ProgressBar/ProgressBar';
import { parseTransfer, transferDetail, transferLabel } from '@/core/utils/transferProgress';
import locales from '@/locales';
import { type JobEvent, useJobEventsStore } from '@/store/jobEvents/jobEvents.store';
import { Typography } from '@mui/material';
import { useShallow } from 'zustand/react/shallow';
import type { JSX } from 'react';
import { RunningJobRowStyled } from './RunningJobs.styled';

const TYPE_LABEL: Record<string, string> = {
  backup: locales.job_type_backup,
  restore: locales.job_type_restore,
  restore_drill: locales.job_type_restore_drill,
  export: locales.job_type_export,
  import: locales.job_type_import,
  query: locales.job_type_query,
  tool_install: locales.job_type_tool_install
};

const isRunning = (job: JobEvent): boolean => job.status === 'running' || job.status === 'pending';

/** Jobs that are running right now, so a user can see what the app is busy with. */
export const useRunningJobs = (): JobEvent[] =>
  useJobEventsStore(useShallow((s) => Object.values(s.jobs).filter(isRunning)));

export default function RunningJobs({ jobs }: { jobs: JobEvent[] }): JSX.Element | null {
  if (jobs.length === 0) return null;

  return (
    <div data-testid='running-jobs'>
      {jobs.map((job) => {
        const transfer = parseTransfer(job.message);

        return (
          <RunningJobRowStyled key={job.id}>
            <Typography variant='body2' color='textTitle'>
              {TYPE_LABEL[job.type] ?? job.type}
            </Typography>
            <ProgressBar
              value={job.status === 'pending' ? undefined : job.progress}
              label={transfer ? transferLabel(transfer) : job.message || undefined}
              detail={transfer ? transferDetail(transfer) : `${job.progress}%`}
            />
          </RunningJobRowStyled>
        );
      })}
    </div>
  );
}
