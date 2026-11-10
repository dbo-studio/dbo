import type { CliResult, CliRunRequest } from '@/api/cli/types';
import { api } from '@/core/api';

/** Runs one terminal line. `signal` aborts the request, which cancels the statement server-side. */
export const run = async (req: CliRunRequest, signal?: AbortSignal): Promise<CliResult> =>
  (await api.post<{ data: CliResult }>('/cli/run', req, { signal, silent: true })).data.data;
