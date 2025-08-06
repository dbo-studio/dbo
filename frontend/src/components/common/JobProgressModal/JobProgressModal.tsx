import api from '@/api';
import { tools } from '@/core/utils/tools';
import { useJobPolling } from '@/hooks/useJobPolling.hook';
import { Box, Button, LinearProgress, List, ListItem, ListItemText, Modal, Typography } from '@mui/material';
import type React from 'react';
import { useEffect, useState } from 'react';

interface JobProgressModalProps {
    open: boolean;
    jobId: string | null;
    onClose: () => void;
    title: string;
}

export const JobProgressModal: React.FC<JobProgressModalProps> = ({
    open,
    jobId,
    onClose,
    title
}) => {
    const [isTauri, setIsTauri] = useState(false);

    useEffect(() => {
        const checkTauri = async () => {
            const tauriResult = await tools.isTauri();
            setIsTauri(tauriResult);
        };
        checkTauri();
    }, []);

    const { job, error: pollingError, cancelJob } = useJobPolling(jobId, {
        onComplete: (job) => {
            console.log('Job completed:', job);
        },
        onError: (error) => {
            console.error('Job error:', error);
        },
    });



    const handleDownload = async () => {
        if (!jobId) return;

        try {
            const blob = await api.job.result(jobId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Get filename from job result or use default
            const fileName = job?.result?.fileName || 'export';
            link.setAttribute('download', fileName);

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading result:', error);
        }
    };

    const getStatusColor = () => {
        switch (job?.status) {
            case 'completed':
                return 'success.main';
            case 'failed':
                return 'error.main';
            case 'cancelled':
                return 'warning.main';
            default:
                return 'primary.main';
        }
    };

    const getStatusMessage = () => {
        if (!job) return 'Connecting...';

        switch (job.status) {
            case 'completed':
                if (job.type === 'import') {
                    const result = job.result;
                    const successRows = result?.successRows || result?.successCount || 0;
                    const failedRows = result?.failedRows || result?.failedCount || 0;
                    const totalRows = result?.totalRows || 0;
                    return `Import completed: ${successRows} successful, ${failedRows} failed (${totalRows} total rows)`;
                }
                return 'Export completed successfully';
            case 'failed':
                return `Job failed: ${job.error}`;
            case 'cancelled':
                return 'Job was cancelled';
            default:
                return job.message || 'Processing...';
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 500,
                maxHeight: 600,
                bgcolor: 'background.paper',
                borderRadius: 2,
                p: 3,
                boxShadow: 24,
                overflow: 'auto',
            }}>
                <Typography variant="h6" gutterBottom>
                    {title}
                </Typography>

                {pollingError && (
                    <Typography variant="body2" color="error.main" gutterBottom>
                        Error: {pollingError}
                    </Typography>
                )}

                {job && (
                    <>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {getStatusMessage()}
                        </Typography>

                        <LinearProgress
                            variant="determinate"
                            value={job.progress}
                            sx={{ mb: 2 }}
                        />

                        <Typography variant="body2" color="text.secondary">
                            Progress: {job.progress}%
                        </Typography>

                        {job.status === 'running' && (
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={cancelJob}
                                    fullWidth
                                >
                                    Cancel Job
                                </Button>
                            </Box>
                        )}

                        {job.status === 'completed' && job.type === 'export' && !isTauri && (
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    variant="contained"
                                    onClick={handleDownload}
                                    fullWidth
                                >
                                    Download File
                                </Button>
                            </Box>
                        )}

                        {job.status === 'completed' && job.type === 'import' && job.result?.errors && job.result.errors.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Error Details ({job.result.errors.length} errors):
                                </Typography>
                                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                                    {job.result.errors.slice(0, 10).map((error: any, index: number) => (
                                        <ListItem key={error.row || error.line}>
                                            <ListItemText
                                                primary={`Row ${error.row || error.line}: ${error.message}`}
                                                secondary={error.value || error.data}
                                            />
                                        </ListItem>
                                    ))}
                                    {job.result.errors.length > 10 && (
                                        <ListItem>
                                            <ListItemText
                                                primary={`... and ${job.result.errors.length - 10} more errors`}
                                                secondary="Only showing first 10 errors"
                                            />
                                        </ListItem>
                                    )}
                                </List>
                            </Box>
                        )}

                        {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={onClose}
                                    fullWidth
                                >
                                    Close
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Modal>
    );
}; 