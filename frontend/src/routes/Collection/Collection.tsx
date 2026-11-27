import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import type { CollectionTabType } from '@/types/Tab';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';
import AggregatePanel from './AggregatePanel';
import SchemaPanel from './SchemaPanel';

/** A collection's own page (Schema, Aggregate), opened as a tab from the tree. */
export default function Collection(): JSX.Element {
  const tab = useSelectedTab<CollectionTabType>();
  const connectionId = Number(tab?.connectionId);
  const containerId = tab?.containerId ?? '';
  if (!tab) return <></>;

  const titles = {
    schema: locales.nosql_schema,
    aggregate: locales.nosql_aggregate
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }} data-testid='collection-tab'>
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant='h6'>{titles[tab.panel]}</Typography>
        <Typography variant='caption' color='text.secondary'>
          {containerId}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
        {tab.panel === 'schema' && (
          <SchemaPanel key={tab.id} connectionId={connectionId} containerId={containerId} />
        )}
        {tab.panel === 'aggregate' && (
          <AggregatePanel key={tab.id} connectionId={connectionId} containerId={containerId} />
        )}
      </Box>
    </Box>
  );
}
