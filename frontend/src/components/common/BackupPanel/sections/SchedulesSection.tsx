import api from '@/api';
import type { BackupArtifactType, BackupScheduleType } from '@/api/backup/types';
import { openBackup } from '@/core/backup/openBackup';
import { tools } from '@/core/utils/tools';
import type { BackupTabType } from '@/types';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Alert, Box, Button, Chip, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { isFinished, useJobEventsStore } from '@/store/jobEvents/jobEvents.store';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import RestoreConfirm from '../RestoreConfirm';
import { JobProgressModal } from '../../JobProgressModal/JobProgressModal';
import { describeCadence, formatDate, formatSize, statusLabel } from '../format';
import { restoreCandidates } from '../restoreCandidates';
import RunInsights from '../RunInsights';
import ScheduleForm from '../ScheduleForm';

type View = { kind: 'dashboard' } | { kind: 'wizard'; editId?: number } | { kind: 'job'; id: number };

const statusColor = (status: BackupScheduleType['lastStatus']): 'success' | 'error' | 'default' =>
  status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'default';

export default function SchedulesSection({ tab }: { tab: BackupTabType }): JSX.Element {
  const queryClient = useQueryClient();
  const confirm = useConfirmModalStore((s) => s.danger);
  const connections = useConnectionStore((s) => s.connections) ?? [];
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
      setJobId(String((await api.backup.runSchedule(job.id)).jobId));
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
              <Button size='small' variant='contained' onClick={() => open('new')}>
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
            setJobId(String(id));
          }}
        />
      )}

      <JobProgressModal
        open={jobId !== null}
        jobId={jobId}
        title={locales.backup_in_progress}
        onClose={() => {
          setJobId(null);
          refresh();
          void queryClient.invalidateQueries({ queryKey: ['backup-runs'] });
        }}
      />
    </>
  );
}

function JobRow({
  job,
  connection,
  onRun,
  onOpen
}: {
  job: BackupScheduleType;
  connection: string;
  onRun: () => void;
  onOpen: () => void;
}): JSX.Element {
  return (
    <Box
      data-testid={`backup-job-${job.name}`}
      sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderTop: 1, borderColor: 'divider' }}
    >
      <Box sx={{ flex: 2, minWidth: 0 }}>
        <Typography variant='body2' noWrap>
          {job.name}
          {job.encrypted ? ` · ${locales.backup_encrypted}` : ''}
          {!job.enabled ? ` · ${locales.backup_schedule_paused}` : ''}
        </Typography>
        <Typography variant='caption' color='textSubdued' noWrap component='p'>
          {connection} · {describeCadence(job)}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Chip size='small' color={statusColor(job.lastStatus)} label={statusLabel(job.lastStatus)} />
      </Box>
      <Box sx={{ flex: 1.4 }}>
        <Typography variant='caption' color='textSubdued' component='p'>
          {locales.backup_job_last_success}
        </Typography>
        <Typography variant='body2'>{formatDate(job.lastSuccessAt)}</Typography>
      </Box>
      <Box sx={{ flex: 1.4 }}>
        <Typography variant='caption' color='textSubdued' component='p'>
          {locales.backup_schedule_next}
        </Typography>
        <Typography variant='body2'>{job.enabled ? formatDate(job.nextRunAt) : '—'}</Typography>
      </Box>
      <Box sx={{ flex: 0.8 }}>
        <Typography variant='caption' color='textSubdued' component='p'>
          {locales.backup_job_size}
        </Typography>
        <Typography variant='body2'>{formatSize(job.lastSize)}</Typography>
      </Box>
      <Typography variant='caption' color='textSubdued' sx={{ flex: 0.9 }}>
        {locales.backup_wizard_local_folder}
      </Typography>
      <Button size='small' onClick={onRun}>
        {locales.backup_schedule_run_now}
      </Button>
      <Button size='small' onClick={onOpen}>
        {locales.backup_job_details}
      </Button>
    </Box>
  );
}

function JobDetail({
  job,
  connection,
  onBack,
  onRun,
  onEdit,
  onToggle,
  onDelete,
  onRestore
}: {
  job: BackupScheduleType;
  connection: string;
  onBack: () => void;
  onRun: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onRestore: (run: BackupArtifactType) => void;
}): JSX.Element {
  const { data: runs = [] } = useQuery({
    queryKey: ['backup-runs', job.id, job.connectionId],
    queryFn: async (): Promise<BackupArtifactType[]> =>
      (await api.backup.history(job.connectionId)).filter((a) => a.scheduleId === job.id)
  });

  const download = async (run: BackupArtifactType): Promise<void> => {
    try {
      tools.fileDownload(await api.backup.download(run.id), run.fileName);
    } catch {
      toast.error(locales.download_failed);
    }
  };

  const [passphrase, setPassphrase] = useState('');
  const [openLog, setOpenLog] = useState<number | null>(null);
  const verify = async (run: BackupArtifactType): Promise<void> => {
    try {
      const result = await api.backup.verify(run.id, passphrase || undefined);
      if (result.ok) toast.success(`${locales.backup_verify_ok}: ${result.message}`);
      else toast.error(`${locales.backup_verify_failed}: ${result.message}`);
    } catch {
      /* the api layer already toasted */
    }
  };

  const seconds = (run: BackupArtifactType): string =>
    run.completedAt
      ? `${Math.max(0, Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000))}s`
      : '—';

  return (
    <Box data-testid='backup-job-detail'>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Button size='small' onClick={onBack}>
          {locales.backup_job_back}
        </Button>
        <Typography variant='subtitle1' sx={{ flex: 1 }}>
          {job.name} · {connection}
        </Typography>
        <Button size='small' onClick={onRun}>
          {locales.backup_schedule_run_now}
        </Button>
        <Button size='small' onClick={onEdit}>
          {locales.backup_job_edit}
        </Button>
        <Button size='small' onClick={onToggle}>
          {job.enabled ? locales.backup_schedule_pause : locales.backup_schedule_resume}
        </Button>
        <Button size='small' color='error' onClick={onDelete}>
          {locales.delete}
        </Button>
      </Box>
      <Typography variant='caption' color='textSubdued' component='p' sx={{ mb: 2 }}>
        {describeCadence(job)}
      </Typography>
      {job.lastStatus === 'failed' && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {locales.backup_schedule_failed}: {job.lastError}
        </Alert>
      )}

      {runs.some((r) => r.encrypted) && (
        <FieldInput
          name='verify-passphrase'
          type='password'
          label={locales.backup_verify_passphrase}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
      )}

      <RunInsights runs={runs} />

      <Typography variant='subtitle2' sx={{ mb: 1 }}>
        {locales.backup_job_runs}
      </Typography>
      {runs.length === 0 && (
        <Typography variant='body2' color='textSubdued'>
          {locales.backup_job_no_runs}
        </Typography>
      )}
      {runs.map((run) => (
        <Box key={run.id} sx={{ borderTop: 1, borderColor: 'divider' }}>
          <Box data-testid={`backup-run-${run.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.75 }}>
            <Box sx={{ flex: 1.5 }}>
              <Typography variant='body2'>{formatDate(run.startedAt)}</Typography>
              <Typography variant='caption' color='textSubdued'>
                {locales.backup_job_duration}: {seconds(run)}
              </Typography>
            </Box>
            <Chip
              size='small'
              color={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'error' : 'default'}
              label={
                run.status === 'completed'
                  ? locales.backup_status_completed
                  : run.status === 'failed'
                    ? locales.backup_status_failed
                    : locales.backup_status_running
              }
            />
            <Typography variant='body2' sx={{ width: 80 }}>
              {formatSize(run.size)}
            </Typography>
            <Box sx={{ flex: 3, minWidth: 0 }}>
              <Typography
                variant='caption'
                color={run.status === 'failed' ? 'error.main' : 'textSubdued'}
                noWrap
                component='p'
              >
                {run.status === 'failed'
                  ? run.error
                  : run.method === 'native'
                    ? `${run.tool} ${run.toolVersion}`
                    : locales.backup_method_basic}
              </Typography>
            </Box>
            {run.log && (
              <Button size='small' onClick={() => setOpenLog(openLog === run.id ? null : run.id)}>
                {openLog === run.id ? locales.backup_job_log_hide : locales.backup_job_log_show}
              </Button>
            )}
            {run.status === 'completed' && (
              <>
                <Button size='small' onClick={() => void verify(run)}>
                  {locales.backup_verify}
                </Button>
                <Button size='small' onClick={() => void download(run)}>
                  {locales.backup_download}
                </Button>
                <Button size='small' color='error' onClick={() => onRestore(run)}>
                  {locales.backup_job_open_restore}
                </Button>
              </>
            )}
          </Box>
          {openLog === run.id && (
            <Box
              component='pre'
              data-testid={`backup-run-log-${run.id}`}
              sx={{ typography: 'caption', m: 0, mb: 1, p: 1, whiteSpace: 'pre-wrap', bgcolor: 'action.hover' }}
            >
              {run.log}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
