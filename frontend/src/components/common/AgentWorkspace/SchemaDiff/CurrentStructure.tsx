import locales from '@/locales';
import type { TableStructure } from '@/types';
import { Box, Button, Collapse } from '@mui/material';
import { type JSX, useState } from 'react';
import { structureLines } from './schemaDiffRows';

/** How the table is defined now, before any proposed change. */
export default function CurrentStructure({ structure }: { structure: TableStructure }): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ px: 1, py: 0.25 }} data-testid='ai-diff-current'>
      <Button variant='text' color='inherit' onClick={() => setOpen((value) => !value)}>
        {locales.ai_changes_current}
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ fontFamily: 'var(--editor-font, monospace)', typography: 'caption', color: 'text.secondary' }}>
          {structureLines(structure).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
