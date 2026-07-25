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

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export const useJobPolling = (jobId: string | null, options: UseJobPollingOptions = {}) => {
  const [trackedJobId, setTrackedJobId] = useState(jobId);
  const [job, setJob] = useState<JobType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const optionsRef = useRef(options);

  if (jobId !== trackedJobId) {
    setTrackedJobId(jobId);
    setJob(null);
    setError(null);
  }

  const pollingInterval = options.pollingInterval ?? 1000;

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const { mutateAsync: getJobMutation } = useMutation({
    mutationFn: api.job.detail
  });

  const { mutateAsync: cancelJobMutation } = useMutation({
    mutationFn: api.job.cancel
  });

  const processJobData = useCallback((jobData: JobType): boolean => {
    const currentOptions = optionsRef.current;

    setJob(jobData);
    setError(null);

    currentOptions.onStatusChange?.(jobData.status, jobData.message);
    currentOptions.onProgress?.(jobData.progress, jobData.message);

    if (jobData.result) {
      currentOptions.onResult?.(jobData.result);
    }

    if (jobData.error) {
      currentOptions.onError?.(jobData.error);
    }

    if (TERMINAL_STATUSES.has(jobData.status)) {
      currentOptions.onComplete?.(jobData);
      return true;
    }

    return false;
  }, []);

  const fetchJob = useCallback(async (): Promise<boolean> => {
    if (!jobId) return true;

    try {
      const jobData = await getJobMutation(jobId);
      return processJobData(jobData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job status');
      console.error('Error fetching job status:', err);
      return false;
    }
  }, [getJobMutation, jobId, processJobData]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    void fetchJob();

    intervalRef.current = setInterval(() => {
      void fetchJob().then((isTerminal) => {
        if (isTerminal && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      });
    }, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchJob, jobId, pollingInterval]);

  const effectiveJob = jobId ? job : null;
  const isPolling = Boolean(jobId && (!effectiveJob || !TERMINAL_STATUSES.has(effectiveJob.status)));

  const cancelJob = useCallback(async () => {
    if (!jobId) return;

    try {
      await cancelJobMutation(jobId);
      const jobData = await getJobMutation(jobId);
      setJob(jobData);
    } catch (err) {
      console.debug('🚀 ~ useJobPolling ~ err:', err);
    }
  }, [cancelJobMutation, getJobMutation, jobId]);

  return {
    job: effectiveJob,
    isPolling,
    error,
    cancelJob
  };
};
