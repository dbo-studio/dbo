import type { JSX } from 'react';

import type { ConnectionSettingsProps } from '../types';
import UriSqlForm from '../UriSqlForm';

export default function Mysql(props: ConnectionSettingsProps): JSX.Element {
  return <UriSqlForm dialect='mysql' {...props} />;
}
