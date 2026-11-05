import type { NoSQLItem } from '@/api/nosql/types';
import { formatBytes } from '@/core/utils/formatBytes';
import locales from '@/locales';

/** Footer facts for a key: "zset · 2 members · 80 B · listpack". Unknown keys are ignored, never printed raw. */
export function itemFacts(item: NoSQLItem | undefined): string[] {
  const meta = item?.meta;
  if (!meta) return [];

  const facts: string[] = [];
  if (typeof meta.type === 'string') facts.push(meta.type);
  if (typeof meta.length === 'number') {
    facts.push(
      meta.length === 1 ? locales.nosql_member_one : locales.nosql_members.replace('{count}', String(meta.length))
    );
  }
  if (typeof meta.memory === 'number') facts.push(formatBytes(meta.memory));
  if (typeof meta.encoding_redis === 'string') facts.push(meta.encoding_redis);

  return facts;
}
