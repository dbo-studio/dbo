import api from '@/api';
import type { BackupArtifactType, BackupScheduleType } from '@/api/backup/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { tools } from '@/core/utils/tools';
import { useAiBridge } from '@/hooks/useAiBridge';
import locales from '@/locales';
import { Alert, Button, Chip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import { describeCadence, formatDate, formatSize } from '../../format';
import { explainFailurePrompt } from '../../explainFailure';
import RunInsights from '../../RunInsights/RunInsights';
import {
  JobDetailRootStyled,
  JobDetailRunBlockStyled,
  JobDetailRunLogStyled,
  JobDetailRunMetaStyled,
  JobDetailRunNoteStyled,
  JobDetailRunRowStyled,
  JobDetailToolbarStyled
} from './JobDetail.styled';

export default function JobDetail({
  job,
  connection,
  onBack,
  onRun,
  onEdit,
  onToggle,
  onDelete,
  onRestore,
  onDrill
}: {
  job: BackupScheduleType;
  connection: string;
  onBack: () => void;
  onRun: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onRestore: (run: BackupArtifactType) => void;
  /** Restores the run into a scratch database to prove it works; the passphrase is for an encrypted run. */
  onDrill: (run: BackupArtifactType, passphrase?: string) => void;
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

  const { prefillChat } = useAiBridge();
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
    <JobDetailRootStyled data-testid='backup-job-detail'>
      <JobDetailToolbarStyled>
        <Button onClick={onBack}>{locales.backup_job_back}</Button>
        <Typography variant='subtitle1' sx={{ flex: 1 }}>
          {job.name} · {connection}
        </Typography>
        <Button onClick={onRun}>{locales.backup_schedule_run_now}</Button>
        <Button onClick={onEdit}>{locales.backup_job_edit}</Button>
        <Button onClick={onToggle}>
          {job.enabled ? locales.backup_schedule_pause : locales.backup_schedule_resume}
        </Button>
        <Button color='error' onClick={onDelete}>
          {locales.delete}
        </Button>
      </JobDetailToolbarStyled>
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
        <JobDetailRunBlockStyled key={run.id}>
          <JobDetailRunRowStyled data-testid={`backup-run-${run.id}`}>
            <JobDetailRunMetaStyled>
              <Typography variant='body2'>{formatDate(run.startedAt)}</Typography>
              <Typography variant='caption' color='textSubdued'>
                {locales.backup_job_duration}: {seconds(run)}
              </Typography>
            </JobDetailRunMetaStyled>
            <Chip
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
            <JobDetailRunNoteStyled>
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
            </JobDetailRunNoteStyled>
            {run.log && (
              <Button onClick={() => setOpenLog(openLog === run.id ? null : run.id)}>
                {openLog === run.id ? locales.backup_job_log_hide : locales.backup_job_log_show}
              </Button>
            )}
            {run.status === 'failed' && (
              <Button onClick={() => prefillChat(explainFailurePrompt(run, job.name), true)}>
                {locales.backup_explain_ai}
              </Button>
            )}
            {run.drillStatus && (
              <Chip
                data-testid={`backup-run-drill-${run.id}`}
                title={run.drillMessage}
                color={run.drillStatus === 'passed' ? 'success' : run.drillStatus === 'failed' ? 'error' : 'default'}
                label={
                  run.drillStatus === 'passed'
                    ? locales.backup_drill_passed
                    : run.drillStatus === 'failed'
                      ? locales.backup_drill_failed
                      : locales.backup_drill_skipped
                }
              />
            )}
            {run.status === 'completed' && (
              <>
                <Button
                  data-testid={`backup-run-drill-run-${run.id}`}
                  onClick={() => onDrill(run, run.encrypted ? passphrase || undefined : undefined)}
                >
                  {locales.backup_drill}
                </Button>
                <Button onClick={() => void verify(run)}>{locales.backup_verify}</Button>
                <Button onClick={() => void download(run)}>{locales.backup_download}</Button>
                <Button color='error' onClick={() => onRestore(run)}>
                  {locales.backup_job_open_restore}
                </Button>
              </>
            )}
          </JobDetailRunRowStyled>
          {openLog === run.id && (
            <JobDetailRunLogStyled data-testid={`backup-run-log-${run.id}`}>{run.log}</JobDetailRunLogStyled>
          )}
        </JobDetailRunBlockStyled>
      ))}
    </JobDetailRootStyled>
  );
}
