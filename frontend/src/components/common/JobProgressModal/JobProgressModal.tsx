import api from '@/api';
import Modal from '@/components/base/Modal/Modal';
import { tools } from '@/core/utils/tools';
import { useJob } from '@/hooks/useJob';
import locales from '@/locales';
import { ErrorType, ImportResultType } from '@/types/Job';
import { Box, Button, LinearProgress, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { JobProgressModalProps } from './types';

const formatBytes = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function JobProgressModal({ open, jobId, onClose, title }: JobProgressModalProps) {
  const [isTauri, setIsTauri] = useState(false);

  const { mutateAsync: jobResultMutation } = useMutation({
    mutationFn: api.job.result
  });

  useEffect(() => {
    void (async () => {
      const tauriResult = await tools.isTauri();
      setIsTauri(tauriResult);
    })();
  }, []);

  const { job, cancelJob } = useJob(jobId === null || jobId === undefined || jobId === '' ? null : Number(jobId));

  const handleDownload = async () => {
    if (!jobId) return;

    try {
      const blob = await jobResultMutation(jobId);
      const fileName = job?.result?.fileName || 'export';
      tools.fileDownload(blob, fileName);
    } catch {
      toast.error(locales.download_failed);
    }
  };

  const getStatusMessage = () => {
    if (!job) return `${locales.connecting}...`;

    switch (job.status) {
      case 'completed':
        if (job.type === 'import') {
          const result = job.result as ImportResultType;
          const successRows = result?.successRows || result?.successCount || 0;
          const failedRows = result?.failedRows || result?.failedCount || 0;
          const totalRows = result?.totalRows || 0;
          return `${locales.import_completed}: ${successRows} ${locales.successful}, ${failedRows} ${locales.failed} (${totalRows} ${locales.total_rows})`;
        }
        return locales.export_completed_successfully;
      case 'failed':
        return `${locales.job_failed}: ${job.error}`;
      case 'canceled':
        return locales.job_cancelled;
      default:
        return job.message || `${locales.processing}...`;
    }
  };

  const finished = job?.status === 'completed' || job?.status === 'failed' || job?.status === 'canceled';
  const canDownload = job?.status === 'completed' && job.type === 'export' && !isTauri;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      padding='24px'
      footer={
        (job?.status === 'running' || finished) && (
          <>
            {job?.status === 'running' && (
              <Button size='small' variant='outlined' onClick={() => void cancelJob()}>
                {locales.cancel_job}
              </Button>
            )}
            {finished && (
              <Button size='small' onClick={onClose}>
                {locales.close}
              </Button>
            )}
            {canDownload && (
              <Button size='small' variant='contained' onClick={() => void handleDownload()}>
                {locales.download_file}
              </Button>
            )}
          </>
        )
      }
    >
      <Box sx={{ width: 'min(500px, calc(100vw - 64px))' }}>
        {job && (
          <>
            <Typography variant='body2' gutterBottom color='textSubdued'>
              {getStatusMessage()}
            </Typography>

            {job.status === 'completed' && job.type === 'export' && job.result && (
              <Typography variant='body2' gutterBottom data-testid='export-result'>
                {[
                  job.result.fileName,
                  job.result.format?.toUpperCase(),
                  job.result.rows === undefined ? undefined : `${job.result.rows} ${locales.ai_unit_rows}`,
                  job.result.size === undefined ? undefined : formatBytes(job.result.size),
                  job.startedAt && job.completedAt
                    ? `${Math.max(1, Math.round((Date.parse(job.completedAt) - Date.parse(job.startedAt)) / 1000))} s`
                    : undefined
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            )}

            <LinearProgress variant='determinate' value={job.progress} sx={{ mb: 2 }} />

            <Typography variant='body2' color='textSubdued'>
              {locales.progress}: {job.progress}%
            </Typography>

            {job.status === 'completed' &&
              job.type === 'import' &&
              job.result?.errors &&
              job.result.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='subtitle2' gutterBottom>
                    {locales.error_details} ({job.result.errors.length} {locales.errors}):
                  </Typography>
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {job.result.errors.slice(0, 10).map((error: ErrorType) => (
                      <ListItem key={error.row || error.line}>
                        <ListItemText
                          primary={`${locales.row} ${error.row || error.line}: ${error.message}`}
                          secondary={error.value || error.data}
                        />
                      </ListItem>
                    ))}
                    {job.result.errors.length > 10 && (
                      <ListItem>
                        <ListItemText
                          primary={`... ${locales.and} ${job.result.errors.length - 10} ${locales.more_errors}`}
                          secondary={locales.only_showing_first_10_errors}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
          </>
        )}
      </Box>
    </Modal>
  );
}
