import api from '@/api';
import * as server from '@/api/server';
import { isMongoDriver } from '@/core/db/connectionAliases';
import { formatServerUptime, serverMetricLabels } from '@/core/utils/serverStatus';
import locales from '@/locales';
import type { ConnectionType } from '@/types';
import { Popover, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { ServerStatusRowStyled } from './ServerStatusPopover.styled';

type Row = [string, string];

const group = (m: Record<string, number>): string =>
  Object.entries(m)
    .map(([k, v]) => `${k} ${v.toLocaleString()}`)
    .join(' · ');

const loadRows = async (connection: ConnectionType): Promise<Row[]> => {
  if (isMongoDriver(connection.type)) {
    const s = await api.nosql.serverStatus(connection.id);
    return [
      [locales.server_version, s.version],
      [locales.server_host, s.host],
      [locales.server_uptime, formatServerUptime(s.uptimeSecs)],
      [locales.server_replica, s.replica || locales.server_standalone],
      [locales.server_connections, group(s.connections)],
      [locales.server_memory, group(s.memoryMb)]
    ];
  }
  const caps = await server.capabilities(connection.id);
  if (!caps.panels.includes('status')) return [];
  const panel = await server.panel(connection.id, 'status');
  return panel.rows.map(([metric, value]): Row => [
    serverMetricLabels[String(metric)] ?? String(metric),
    metric === 'uptime' ? formatServerUptime(Number(value)) : String(value)
  ]);
};

/** A small read-only card with the server's vitals, opened from the footer's connection item. */
export default function ServerStatusPopover({
  connection,
  anchor,
  onClose
}: {
  connection: ConnectionType;
  anchor: HTMLElement | null;
  onClose: () => void;
}): JSX.Element {
  const { data, isError, isPending } = useQuery({
    queryKey: ['server-status-popover', connection],
    queryFn: () => loadRows(connection),
    enabled: !!anchor,
    refetchInterval: anchor ? 5000 : false,
    retry: false
  });

  return (
    <Popover
      open={!!anchor}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{
        paper: { sx: { width: 300, mb: 0.5, backgroundImage: 'none' } },
        root: { 'data-testid': 'server-status-popover' } as object
      }}
    >
      <Typography variant='subtitle2' color='textTitle' sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
        {connection.name}
      </Typography>
      {isError || (data && data.length === 0) ? (
        <Typography color='text.secondary' variant='caption' sx={{ px: 1.5, pb: 1.25, display: 'block' }}>
          {locales.action_failed}
        </Typography>
      ) : isPending ? (
        <Typography color='text.secondary' variant='caption' sx={{ px: 1.5, pb: 1.25, display: 'block' }}>
          {locales.loading}
        </Typography>
      ) : (
        data?.map(([label, value]) => (
          <ServerStatusRowStyled key={label}>
            <Typography variant='caption' color='text.secondary'>
              {label}
            </Typography>
            <Typography variant='caption' color='text.primary' sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
              {value}
            </Typography>
          </ServerStatusRowStyled>
        ))
      )}
    </Popover>
  );
}
