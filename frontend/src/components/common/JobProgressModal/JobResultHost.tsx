import { useJobResultModalStore } from '@/store/jobResultModal/jobResultModal.store';
import type { JSX } from 'react';
import { JobProgressModal } from './JobProgressModal';

/** Opens a job from a notification: import summary, export download, or the reason a job failed. */
export default function JobResultHost(): JSX.Element {
  const jobId = useJobResultModalStore((state) => state.jobId);
  const title = useJobResultModalStore((state) => state.title);
  const close = useJobResultModalStore((state) => state.close);
  const open = useJobResultModalStore((state) => state.open);

  return (
    <JobProgressModal
      open={jobId !== null}
      jobId={jobId === null ? null : String(jobId)}
      title={title}
      onClose={close}
      onRetry={(id) => open(id, title)}
    />
  );
}
