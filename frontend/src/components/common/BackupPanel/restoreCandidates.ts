import { isMysqlDriver, isPostgresDriver } from '@/core/db/connectionAliases';
import type { ConnectionType } from '@/types';

/** The backup's own connection first, then other writable connections of the same engine. */
export function restoreCandidates(connectionId: number, all: ConnectionType[]): ConnectionType[] {
  const home = all.find((c) => c.id === connectionId);
  if (!home) return [];

  const sameFamily = (c: ConnectionType): boolean =>
    isPostgresDriver(home.type)
      ? isPostgresDriver(c.type)
      : isMysqlDriver(home.type)
        ? isMysqlDriver(c.type)
        : c.type === home.type;

  return [home, ...all.filter((c) => c.id !== home.id && sameFamily(c) && (c.access ?? 'owner') !== 'viewer')];
}
