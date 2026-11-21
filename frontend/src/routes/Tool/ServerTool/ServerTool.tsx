import Segmented from '@/components/base/Segmented/Segmented';
import locales from '@/locales';
import { Box } from '@mui/material';
import { type JSX, useState } from 'react';
import Changes from './Changes/Changes';
import Databases from './Databases/Databases';
import GridFs from './GridFs/GridFs';
import Operations from './Operations/Operations';
import ServerStatus from './Status/Status';
import Users from './Users/Users';
import { type ServerToolProps, type ServerToolTab } from './serverToolShared';

export default function ServerTool({ connectionId }: ServerToolProps): JSX.Element {
  const [tab, setTab] = useState<ServerToolTab>('status');
  const panel = {
    status: ServerStatus,
    operations: Operations,
    databases: Databases,
    users: Users,
    gridfs: GridFs,
    changes: Changes
  }[tab];
  const Panel = panel;

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }} data-testid='server-tool'>
      <Box sx={{ mb: 2 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          testId='server-tabs'
          options={(
            [
              ['status', locales.server_tab_status],
              ['operations', locales.server_tab_operations],
              ['databases', locales.server_tab_databases],
              ['users', locales.server_tab_users],
              ['gridfs', locales.server_tab_gridfs],
              ['changes', locales.server_tab_changes]
            ] as [ServerToolTab, string][]
          ).map(([value, label]) => ({ value, label }))}
        />
      </Box>
      <Panel connectionId={connectionId} />
    </Box>
  );
}
