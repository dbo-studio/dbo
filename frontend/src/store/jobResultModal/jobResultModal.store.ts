import { create } from 'zustand';

/** The job a notification opened: its progress or result shows in one app-wide modal. */
type JobResultModalStore = {
  jobId: number | null;
  title: string;
  open: (jobId: number, title: string) => void;
  close: () => void;
};

export const useJobResultModalStore = create<JobResultModalStore>((set) => ({
  jobId: null,
  title: '',
  open: (jobId, title) => set({ jobId, title }),
  close: () => set({ jobId: null })
}));
