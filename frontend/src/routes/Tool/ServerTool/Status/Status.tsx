import api from '@/api';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import Facts from '../Facts/Facts';
import { formatServerUptime, type ServerToolProps } from '../serverToolShared';

export default function Status({ connectionId }: ServerToolProps): JSX.Element {
  const { data, isError } = useQuery({
    queryKey: ['server', 'status', connectionId],
    queryFn: () => api.nosql.serverStatus(connectionId),
    refetchInterval: 5000
  });
  if (isError) return <Typography color='error'>{locales.action_failed}</Typography>;
  if (!data) return <Typography color='text.secondary'>{locales.loading}</Typography>;

  const group = (m: Record<string, number>): string =>
    Object.entries(m)
      .map(([k, v]) => `${k} ${v.toLocaleString()}`)
      .join(' · ');

  return (
    <Facts
      rows={[
        [locales.server_version, data.version],
        [locales.server_host, data.host],
        [locales.server_uptime, formatServerUptime(data.uptimeSecs)],
        [locales.server_replica, data.replica || locales.server_standalone],
        [locales.server_connections, group(data.connections)],
        [locales.server_memory, group(data.memoryMb)],
        [locales.server_opcounters, group(data.opCounters)]
      ]}
    />
  );
}
