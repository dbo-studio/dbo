import api from '@/api';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useEffect } from 'react';
import { toast } from 'sonner';

const SEEN_KEY = 'dbo:backup-failures-seen';
const POLL_MS = 60_000;

const readSeen = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

/** In-app failure alert: toasts once per failed scheduled run. */
export default function BackupFailureWatcher(): JSX.Element | null {
  // Connections load only after sign-in, so this keeps the poll off the login gate.
  const signedIn = useConnectionStore((s) => (s.connections?.length ?? 0) > 0);
  const { data: schedules } = useQuery({
    queryKey: ['backup-schedules'],
    queryFn: api.backup.schedules,
    enabled: signedIn,
    refetchInterval: POLL_MS
  });

  useEffect(() => {
    if (!schedules) return;

    const seen = readSeen();
    let changed = false;

    for (const s of schedules) {
      if (s.lastStatus !== 'failed' || !s.lastRunAt || seen[s.id] === s.lastRunAt) continue;

      seen[s.id] = s.lastRunAt;
      changed = true;
      toast.error(locales.backup_schedule_failure_toast.replace('{name}', s.name).replace('{error}', s.lastError));
    }

    if (changed) {
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
      } catch {
        /* storage may be blocked; the toast just repeats next load */
      }
    }
  }, [schedules]);

  return null;
}
