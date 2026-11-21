import api from '@/api';
import type { BackupArtifactType, BackupScheduleType } from '@/api/backup/types';
import { openBackup } from '@/core/backup/openBackup';
import type { BackupTabType } from '@/types';
import { supportsBackup } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Alert, Box, Button, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import { isFinished, useJobEventsStore } from '@/store/jobEvents/jobEvents.store';
import RestoreConfirm from '../RestoreConfirm';
import { JobProgressModal } from '../../JobProgressModal/JobProgressModal';
import { restoreCandidates } from '../restoreCandidates';
import ScheduleForm from '../ScheduleForm';
import JobDetail from './JobDetail/JobDetail';
import JobRow from './JobRow/JobRow';

type View = { kind: 'dashboard' } | { kind: 'wizard'; editId?: number } | { kind: 'job'; id: number };

export default function SchedulesSection({ tab }: { tab: BackupTabType }): JSX.Element {
  const queryClient = useQueryClient();
  const confirm = useConfirmModalStore((s) => s.danger);
  // Redis has nothing to dump, so it is not offered.
  const connections = (useConnectionStore((s) => s.connections) ?? []).filter((c) => supportsBackup(c.type));
  // Which schedule is open lives on the tab, so the sidebar list and this page always agree.
  const [editing, setEditing] = useState<number | null>(null);
  const [seen, setSeen] = useState(tab.scheduleId);
  if (seen !== tab.scheduleId) {
    setSeen(tab.scheduleId);
    setEditing(null);
  }
  const view: View =
    editing !== null
      ? { kind: 'wizard', editId: editing }
      : tab.scheduleId === 'new'
        ? { kind: 'wizard' }
        : typeof tab.scheduleId === 'number'
          ? { kind: 'job', id: tab.scheduleId }
          : { kind: 'dashboard' };
  const open = (scheduleId?: number | 'new'): void => openBackup({ section: 'schedules', scheduleId });
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState(locales.backup_in_progress);
  const follow = (id: number, title: string): void => {
    setJobTitle(title);
    setJobId(String(id));
  };
  const [restoreRun, setRestoreRun] = useState<BackupArtifactType | null>(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ['backup-schedules'],
    queryFn: api.backup.schedules
  });

  const refresh = (): void => void queryClient.invalidateQueries({ queryKey: ['backup-schedules'] });

  // A scheduled run ends on the server; the job stream tells this screen to reload instead of a timer.
  const finishedBackups = useJobEventsStore(
    (s) => Object.values(s.jobs).filter((j) => j.type === 'backup' && isFinished(j.status)).length
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload only when the count of finished backups changes
  useEffect(() => {
    if (finishedBackups > 0) refresh();
  }, [finishedBackups]);
  const connectionName = (id: number): string => connections.find((c) => c.id === id)?.name ?? `#${id}`;
  const failing = jobs.filter((j) => j.enabled && j.lastStatus === 'failed');

  const run = async (job: BackupScheduleType): Promise<void> => {
    try {
      follow((await api.backup.runSchedule(job.id)).jobId, locales.backup_in_progress);
    } catch {
      /* the api layer already toasted */
    }
  };

  const toggle = async (job: BackupScheduleType): Promise<void> => {
    try {
      await api.backup.updateSchedule(job.id, { enabled: !job.enabled });
      refresh();
    } catch {
      /* the api layer already toasted */
    }
  };

  const remove = (job: BackupScheduleType): void => {
    confirm(locales.delete_action, locales.backup_schedule_delete_confirm, () => {
      void api.backup
        .deleteSchedule(job.id)
        .then(() => {
          open();
          refresh();
        })
        .catch(() => undefined);
    });
  };

  const selected = view.kind === 'job' ? jobs.find((j) => j.id === view.id) : undefined;

  return (
    <>
      <Box data-testid='backup-console' sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {failing.length > 0 && view.kind === 'dashboard' && (
          <Alert severity='error' sx={{ mb: 2 }} data-testid='backup-console-banner'>
            {locales.backup_console_failing.replace('{count}', String(failing.length))}
          </Alert>
        )}

        {view.kind === 'wizard' && (
          <ScheduleForm
            job={view.editId === undefined ? undefined : jobs.find((j) => j.id === view.editId)}
            onCancel={() => {
              setEditing(null);
              open(view.editId);
            }}
            onDone={() => {
              refresh();
              setEditing(null);
              open(view.editId);
            }}
          />
        )}

        {view.kind === 'dashboard' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant='subtitle2' sx={{ flex: 1 }}>
                {locales.backup_jobs}
              </Typography>
              <Button variant='contained' onClick={() => open('new')}>
                {locales.backup_job_new}
              </Button>
            </Box>
            {jobs.length === 0 && (
              <Typography variant='body2' color='textSubdued'>
                {locales.backup_job_empty}
              </Typography>
            )}
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                connection={connectionName(job.connectionId)}
                onRun={() => void run(job)}
                onOpen={() => open(job.id)}
              />
            ))}
          </>
        )}

        {view.kind === 'job' && selected && (
          <JobDetail
            job={selected}
            connection={connectionName(selected.connectionId)}
            onBack={() => open()}
            onRun={() => void run(selected)}
            onEdit={() => setEditing(selected.id)}
            onToggle={() => void toggle(selected)}
            onDelete={() => remove(selected)}
            onRestore={setRestoreRun}
            onDrill={(run, passphrase) =>
              void api.backup
                .drillBackup(run.id, passphrase)
                .then((r) => follow(r.jobId, locales.backup_drill_running))
                .catch(() => undefined)
            }
          />
        )}
      </Box>

      {restoreRun && selected && (
        <RestoreConfirm
          candidates={restoreCandidates(selected.connectionId, connections)}
          artifact={restoreRun}
          defaultDatabase={restoreRun.database}
          schema={restoreRun.schema || undefined}
          onCancel={() => setRestoreRun(null)}
          onStarted={(id) => {
            setRestoreRun(null);
            follow(id, locales.backup_in_progress);
          }}
        />
      )}

      <JobProgressModal
        open={jobId !== null}
        jobId={jobId}
        title={jobTitle}
        onClose={() => {
          setJobId(null);
          refresh();
          void queryClient.invalidateQueries({ queryKey: ['backup-runs'] });
        }}
      />
    </>
  );
}
