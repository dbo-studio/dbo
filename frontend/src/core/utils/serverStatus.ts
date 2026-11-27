import locales from '@/locales';

export const formatServerUptime = (secs: number): string => {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${secs % 60}s`;
};

/** Labels for the metric keys SQL drivers return from their `status` panel. */
export const serverMetricLabels: Record<string, string> = {
  version: locales.server_version,
  host: locales.server_host,
  uptime: locales.server_uptime,
  connections: locales.server_connections,
  maxConnections: locales.server_max_connections,
  edition: locales.server_edition,
  memory: locales.server_memory_usage,
  role: locales.server_role
};
