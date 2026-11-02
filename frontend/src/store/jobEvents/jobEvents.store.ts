import { create } from 'zustand';

/** What the live stream last said about a job. The database stays the source of truth for results. */
export type JobEvent = {
  id: number;
  type: 'import' | 'export' | 'query';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  progress: number;
  message: string;
  error?: string;
};

export const isFinished = (status: JobEvent['status'] | undefined): boolean =>
  status === 'completed' || status === 'failed' || status === 'canceled';

type JobEventsStore = {
  jobs: Record<number, JobEvent>;
  record: (event: JobEvent) => void;
};

export const useJobEventsStore = create<JobEventsStore>((set) => ({
  jobs: {},
  record: (event) => set((state) => ({ jobs: { ...state.jobs, [event.id]: event } }))
}));
