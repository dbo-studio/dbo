import api from '@/api';
import type { JobDetailResponseType } from '@/api/job/types';
import { isFinished, useJobEventsStore } from '@/store/jobEvents/jobEvents.store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

/**
 * A job as the screen shows it: the saved state, kept current by the live stream. Progress comes from
 * events; when one reports an end, the job is read again for its result.
 */
export const useJob = (
  jobId: number | null
): { job: JobDetailResponseType | undefined; cancelJob: () => Promise<void> } => {
  const queryClient = useQueryClient();
  const event = useJobEventsStore((state) => (jobId === null ? undefined : state.jobs[jobId]));
  const { data } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.job.detail(String(jobId)),
    enabled: jobId !== null,
    // Lists of finished jobs do not change; a running one is updated by events.
    staleTime: Infinity
  });

  const ended = isFinished(event?.status);
  useEffect(() => {
    if (jobId !== null && ended) void queryClient.invalidateQueries({ queryKey: ['job', jobId] });
  }, [ended, jobId, queryClient]);

  const cancelJob = useCallback(async (): Promise<void> => {
    if (jobId === null) return;

    await api.job.cancel(String(jobId));
    await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
  }, [jobId, queryClient]);

  // Until the read catches up with an event, show the event.
  const job = data && event && !isFinished(data.status) ? { ...data, ...event } : data;

  return { job, cancelJob };
};
