export type JobProgressModalProps = {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  title: string;
  /** Offered on an ended import or export; receives the new job to follow. */
  onRetry?: (jobId: number) => void;
};
