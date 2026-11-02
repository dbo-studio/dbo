export type ProgressBarStatus = 'active' | 'success' | 'error';

export type ProgressBarProps = {
  /** 0-100. Omit for an indeterminate bar. */
  value?: number;
  status?: ProgressBarStatus;
  /** Left caption, e.g. the current phase. */
  label?: string;
  /** Right caption, e.g. "12.4 / 45.0 MB · 3.2 MB/s · 10s left". */
  detail?: string;
  testId?: string;
};
