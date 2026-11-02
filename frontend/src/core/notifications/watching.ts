import { useEffect } from 'react';

/** Jobs the user is watching right now (progress bar or dialog open); announcing them again would be noise. */
const watched = new Map<number, number>();

export const isWatched = (jobId: number | null): boolean => jobId !== null && (watched.get(jobId) ?? 0) > 0;

// The finish event can land just after the progress UI closes, so a watch outlives it briefly.
const GRACE_MS = 4000;

export function watchJob(jobId: number): () => void {
  watched.set(jobId, (watched.get(jobId) ?? 0) + 1);

  return (): void => {
    window.setTimeout(() => {
      const left = (watched.get(jobId) ?? 1) - 1;
      if (left <= 0) watched.delete(jobId);
      else watched.set(jobId, left);
    }, GRACE_MS);
  };
}

/** Watches `jobId` while the component that shows its progress is mounted. */
export function useWatchJob(jobId: number | string | null | undefined, active = true): void {
  useEffect(() => {
    const id = Number(jobId);
    if (!active || !jobId || Number.isNaN(id)) return;

    return watchJob(id);
  }, [jobId, active]);
}
