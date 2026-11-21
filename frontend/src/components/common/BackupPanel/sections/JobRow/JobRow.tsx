import type { BackupScheduleType } from '@/api/backup/types';
import locales from '@/locales';
import { Button, Chip, Typography } from '@mui/material';
import type { JSX } from 'react';
import { describeCadence, formatDate, formatSize, statusLabel } from '../../format';
import { JobRowFlexStyled, JobRowMainStyled, JobRowRootStyled } from './JobRow.styled';

const statusColor = (status: BackupScheduleType['lastStatus']): 'success' | 'error' | 'default' =>
  status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'default';

export default function JobRow({
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
    <JobRowRootStyled data-testid={`backup-job-${job.name}`}>
      <JobRowMainStyled>
        <Typography variant='body2' noWrap>
          {job.name}
          {job.encrypted ? ` · ${locales.backup_encrypted}` : ''}
          {!job.enabled ? ` · ${locales.backup_schedule_paused}` : ''}
        </Typography>
        <Typography variant='caption' color='textSubdued' noWrap component='p'>
          {connection} · {describeCadence(job)}
        </Typography>
      </JobRowMainStyled>
      <JobRowFlexStyled flexGrow={1}>
        <Chip color={statusColor(job.lastStatus)} label={statusLabel(job.lastStatus)} />
      </JobRowFlexStyled>
      <JobRowFlexStyled flexGrow={1.4}>
        <Typography variant='caption' color='textSubdued' component='p'>
          {locales.backup_job_last_success}
        </Typography>
        <Typography variant='body2'>{formatDate(job.lastSuccessAt)}</Typography>
      </JobRowFlexStyled>
      <JobRowFlexStyled flexGrow={1.4}>
        <Typography variant='caption' color='textSubdued' component='p'>
          {locales.backup_schedule_next}
        </Typography>
        <Typography variant='body2'>{job.enabled ? formatDate(job.nextRunAt) : '—'}</Typography>
      </JobRowFlexStyled>
      <JobRowFlexStyled flexGrow={0.8}>
        <Typography variant='caption' color='textSubdued' component='p'>
          {locales.backup_job_size}
        </Typography>
        <Typography variant='body2'>{formatSize(job.lastSize)}</Typography>
      </JobRowFlexStyled>
      <Typography variant='caption' color='textSubdued' sx={{ flex: 0.9 }}>
        {locales.backup_wizard_local_folder}
      </Typography>
      <Button onClick={onRun}>{locales.backup_schedule_run_now}</Button>
      <Button onClick={onOpen}>{locales.backup_job_details}</Button>
    </JobRowRootStyled>
  );
}