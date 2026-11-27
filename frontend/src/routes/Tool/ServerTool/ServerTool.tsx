import type { JSX } from 'react';
import DriverServer from './DriverServer/DriverServer';
import type { ServerToolProps } from './serverToolShared';

/** The SQL and Redis drivers' server tool: a tabbed grid of the engine's own views. */
export default function ServerTool(props: ServerToolProps): JSX.Element {
  return <DriverServer {...props} />;
}
