import api from '@/api';
import { JobType } from '@/types/Job';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

type UseJobPollingOptions = {
  onProgress?: (progress: number, message: string) => void;
  onStatusChange?: (status: string, message: string) => void;
  onError?: (error: string) => void;
  onResult?: (result: unknown) => void;
  onComplete?: (job: JobType) => void;
  pollingInterval?: number;
};

export const useJobPolling = (jobId: string | null, options: UseJobPollingOptions = {}) => {
  const [job, setJob] = useState<JobType | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { mutateAsync: getJobMutation } = useMutation({
    mutationFn: api.job.detail
  });

  const { mutateAsync: cancelJobMutation } = useMutation({
    mutationFn: api.job.cancel
  });

  const initialFetch = async () => {
    try {
      if (!jobId) return;
      const jobData = await getJobMutation(jobId);

      setJob(jobData);
      setError(null);

      options.onStatusChange?.(jobData.status, jobData.message);
      options.onProgress?.(jobData.progress, jobData.message);

      if (jobData.result) {
        options.onResult?.(jobData.result);
      }

      if (jobData.error) {
        options.onError?.(jobData.error);
      }

      if (jobData.status === 'completed' || jobData.status === 'failed' || jobData.status === 'cancelled') {
        setIsPolling(false);
        options.onComplete?.(jobData);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job status');
      console.error('Error fetching job status:', err);
    }
  };

  const refetchApi = async () => {
    try {
      if (!jobId) return;
      const jobData = await getJobMutation(jobId);

      setJob(jobData);
      setError(null);

      options.onStatusChange?.(jobData.status, jobData.message);
      options.onProgress?.(jobData.progress, jobData.message);

      if (jobData.result) {
        options.onResult?.(jobData.result);
      }

      if (jobData.error) {
        options.onError?.(jobData.error);
      }

      if (jobData.status === 'completed' || jobData.status === 'failed' || jobData.status === 'cancelled') {
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        options.onComplete?.(jobData);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job status');
      console.debug('🚀 ~ useJobPolling ~ err:', err);
    }
  };

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    initialFetch().catch((e) => console.debug('🚀 ~ useJobPolling ~ e:', e));

    intervalRef.current = setInterval(() => {
      refetchApi().catch((e) => console.debug('🚀 ~ useJobPolling ~ e:', e));
    }, options.pollingInterval || 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, [jobId, options.pollingInterval || 1000]);

  const cancelJob = useCallback(async () => {
    if (!jobId) return;

    try {
      await cancelJobMutation(jobId);
      const jobData = await getJobMutation(jobId);
      setJob(jobData);
    } catch (err) {
      console.debug('🚀 ~ useJobPolling ~ err:', err);
    }
  }, [jobId]);

  return {
    job,
    isPolling,
    error,
    cancelJob
  };
};
