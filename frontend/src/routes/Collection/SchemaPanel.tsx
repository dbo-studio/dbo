import { Box } from '@mui/material';
import type { JSX } from 'react';
import Analysis from './SchemaPanel/Analysis/Analysis';

type SchemaPanelProps = { connectionId: number; containerId: string };

/** The inferred schema of a collection. Its validation rule is edited in Edit collection. */
export default function SchemaPanel({ connectionId, containerId }: SchemaPanelProps): JSX.Element {
  return (
    <Box data-testid='schema-panel'>
      <Analysis connectionId={connectionId} containerId={containerId} />
    </Box>
  );
}
