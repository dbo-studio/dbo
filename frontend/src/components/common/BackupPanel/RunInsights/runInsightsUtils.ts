import type { BackupArtifactType } from '@/api/backup/types';

const WINDOW = 30;

const average = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

const secondsOf = (run: BackupArtifactType): number =>
  run.completedAt ? Math.max(0, (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000) : 0;

/** Numbers over the newest runs. Runs still in progress say nothing yet, so they are left out. */
export const summarizeRuns = (
  runs: BackupArtifactType[]
): { total: number; succeeded: number; avgSize: number; avgSeconds: number; sizes: number[] } => {
  const finished = runs.filter((r) => r.status !== 'running').slice(0, WINDOW);
  const done = finished.filter((r) => r.status === 'completed');
  return {
    total: finished.length,
    succeeded: done.length,
    avgSize: average(done.map((r) => r.size)),
    avgSeconds: average(done.map(secondsOf)),
    // oldest first, so the line reads left to right through time
    sizes: done.map((r) => r.size).reverse()
  };
};
