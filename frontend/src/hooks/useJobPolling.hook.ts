import api from '@/api';
import { useCallback, useEffect, useRef, useState } from 'react';

type JobType = {
  id: string;
  type: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  error?: string;
  data?: any;
  result?: any;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
};

type UseJobPollingOptions = {
  onProgress?: (progress: number, message: string) => void;
  onStatusChange?: (status: string, message: string) => void;
  onError?: (error: string) => void;
  onResult?: (result: any) => void;
  onComplete?: (job: JobType) => void;
  pollingInterval?: number;
};

export const useJobPolling = (jobId: string | null, options: UseJobPollingOptions = {}) => {
  const [job, setJob] = useState<JobType | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { pollingInterval = 1000 } = options;

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const initialFetch = async () => {
      try {
        const response = await api.job.detail(jobId);
        const jobData = response;

        setJob(jobData);
        setError(null);

        // Call callbacks
        options.onStatusChange?.(jobData.status, jobData.message);
        options.onProgress?.(jobData.progress, jobData.message);

        if (jobData.result) {
          options.onResult?.(jobData.result);
        }

        if (jobData.error) {
          options.onError?.(jobData.error);
        }

        // Check if job is completed
        if (jobData.status === 'completed' || jobData.status === 'failed' || jobData.status === 'cancelled') {
          setIsPolling(false);
          // Only call onComplete if this is the first time we see the completed status
          options.onComplete?.(jobData);
          return; // Stop polling
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch job status');
        console.error('Error fetching job status:', err);
      }
    };

    initialFetch();

    intervalRef.current = setInterval(async () => {
      console.log('Polling interval triggered for jobId:', jobId);
      try {
        const response = await api.job.detail(jobId);
        const jobData = response; // getJobStatus already returns the job data
        console.log('Job status response:', jobData);

        setJob(jobData);
        setError(null);

        // Call callbacks
        options.onStatusChange?.(jobData.status, jobData.message);
        options.onProgress?.(jobData.progress, jobData.message);

        if (jobData.result) {
          options.onResult?.(jobData.result);
        }

        if (jobData.error) {
          options.onError?.(jobData.error);
        }

        // Check if job is completed
        if (jobData.status === 'completed' || jobData.status === 'failed' || jobData.status === 'cancelled') {
          setIsPolling(false);
          // Clear interval when job is completed
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Only call onComplete if this is the first time we see the completed status
          options.onComplete?.(jobData);
          return; // Stop polling
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch job status');
        console.error('Error fetching job status:', err);
      }
    }, pollingInterval);

    return () => {
      console.log('Cleaning up polling for jobId:', jobId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, [jobId, pollingInterval]);

  const cancelJob = useCallback(async () => {
    if (!jobId) return;

    try {
      await api.job.cancel(jobId);
      // Fetch updated status
      const response = await api.job.detail(jobId);
      const jobData = response.data;
      setJob(jobData);
    } catch (err) {
      console.error('Error cancelling job:', err);
    }
  }, [jobId]);

  return {
    job,
    isPolling,
    error,
    cancelJob
  };
};
