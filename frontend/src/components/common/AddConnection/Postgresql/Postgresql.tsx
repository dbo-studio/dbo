import type { JSX } from 'react';

import type { ConnectionSettingsProps } from '../types';
import UriSqlForm from '../UriSqlForm';

export default function PostgreSQL(props: ConnectionSettingsProps): JSX.Element {
  return <UriSqlForm dialect='postgresql' {...props} />;
}
