import type { JSX } from 'react';
import locales from '@/locales';
import ServerGrid from '../ServerGrid/ServerGrid';

export default function Facts({ rows }: { rows: [string, string][] }): JSX.Element {
  return <ServerGrid headers={[locales.server_metric, locales.server_value]} values={rows} />;
}
