import Grid, { GridItem } from '@/components/base/Grid/Grid';
import { styled } from '@mui/material';
import type { ReactNode } from 'react';

const Toolbar = styled(Grid)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
  minHeight: 40,
  gap: theme.spacing(1)
}));

const Actions = styled(GridItem)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5)
}));

export default function BrowseActionBar({ input, children }: { input: ReactNode; children: ReactNode }) {
  return (
    <Toolbar templateColumns={{ xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) max-content' }}>
      <GridItem sx={{ minWidth: 0 }}>{input}</GridItem>
      <Actions>{children}</Actions>
    </Toolbar>
  );
}
