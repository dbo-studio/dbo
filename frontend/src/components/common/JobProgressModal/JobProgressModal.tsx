import api from '@/api';
import { tools } from '@/core/utils/tools';
import { useJobPolling } from '@/hooks/useJobPolling.hook';
import locales from '@/locales';
import { Box, Button, LinearProgress, List, ListItem, ListItemText, Modal, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { JobProgressModalContainer } from './JobProgressModal.styled';
import type { JobProgressModalProps } from './types';

export function JobProgressModal({ open, jobId, onClose, title }: JobProgressModalProps) {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const checkTauri = async () => {
      const tauriResult = await tools.isTauri();
      setIsTauri(tauriResult);
    };
    checkTauri();
  }, []);

  const { job, error: pollingError, cancelJob } = useJobPolling(jobId);

  const handleDownload = async () => {
    if (!jobId) return;

    try {
      const blob = await api.job.result(jobId);
      const fileName = job?.result?.fileName || 'export';
      tools.fileDownload(blob, fileName);
    } catch (error) {
      console.debug('🚀 ~ handleDownload ~ error:', error);
    }
  };

  const getStatusMessage = () => {
    if (!job) return `${locales.connecting}...`;

    switch (job.status) {
      case 'completed':
        if (job.type === 'import') {
          const result = job.result;
          const successRows = result?.successRows || result?.successCount || 0;
          const failedRows = result?.failedRows || result?.failedCount || 0;
          const totalRows = result?.totalRows || 0;
          return `${locales.import_completed}: ${successRows} ${locales.successful}, ${failedRows} ${locales.failed} (${totalRows} ${locales.total_rows})`;
        }
        return locales.export_completed_successfully;
      case 'failed':
        return `${locales.job_failed}: ${job.error}`;
      case 'cancelled':
        return locales.job_cancelled;
      default:
        return job.message || `${locales.processing}...`;
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <JobProgressModalContainer>
        <Typography variant='h6' gutterBottom>
          {title}
        </Typography>

        {pollingError && (
          <Typography variant='body2' color='error.main' gutterBottom>
            {locales.error}: {pollingError}
          </Typography>
        )}

        {job && (
          <>
            <Typography variant='body2' color='text.secondary' gutterBottom>
              {getStatusMessage()}
            </Typography>

            <LinearProgress variant='determinate' value={job.progress} sx={{ mb: 2 }} />

            <Typography variant='body2' color='text.secondary'>
              {locales.progress}: {job.progress}%
            </Typography>

            {job.status === 'running' && (
              <Box sx={{ mt: 2 }}>
                <Button variant='outlined' onClick={cancelJob} fullWidth>
                  {locales.cancel_job}
                </Button>
              </Box>
            )}

            {job.status === 'completed' && job.type === 'export' && !isTauri && (
              <Box sx={{ mt: 2 }}>
                <Button variant='contained' onClick={handleDownload} fullWidth>
                  {locales.download_file}
                </Button>
              </Box>
            )}

            {job.status === 'completed' &&
              job.type === 'import' &&
              job.result?.errors &&
              job.result.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='subtitle2' gutterBottom>
                    {locales.error_details} ({job.result.errors.length} {locales.errors}):
                  </Typography>
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {job.result.errors.slice(0, 10).map((error: any) => (
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

            {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
              <Box sx={{ mt: 2 }}>
                <Button variant='outlined' onClick={onClose} fullWidth>
                  {locales.close}
                </Button>
              </Box>
            )}
          </>
        )}
      </JobProgressModalContainer>
    </Modal>
  );
}
