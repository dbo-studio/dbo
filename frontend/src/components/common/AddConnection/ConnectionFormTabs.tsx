import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { variables } from '@/core/theme/variables';
import locales from '@/locales';
import { Box, ButtonBase, Collapse, Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';

import type { ConnectionFormTabsProps } from './types';

function Section({ id, label, children }: { id: 'ssl' | 'ssh'; label: string; children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={(theme) => ({ border: `1px solid ${theme.palette.divider}`, borderRadius: variables.radius.medium })}>
      <ButtonBase
        data-testid={`connection-tab-${id}`}
        aria-expanded={open}
        onClick={(): void => setOpen((value) => !value)}
        sx={{ width: '100%', justifyContent: 'flex-start', gap: 1, px: 1.5, py: 1, textAlign: 'left' }}
      >
        <CustomIcon type={open ? 'chevronDown' : 'chevronRight'} size='xs' />
        <Typography variant='body2' color='textTitle' sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
      </ButtonBase>
      {/* Stays mounted when closed so the fields keep their values and tests can still reach them. */}
      <Collapse in={open}>
        <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

/** The general fields up front; SSL and the SSH tunnel fold away until the user needs them. */
export default function ConnectionFormTabs({ general, ssl, ssh }: ConnectionFormTabsProps): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>{general}</Box>
      <Section id='ssl' label={locales.connection_section_ssl}>
        {ssl}
      </Section>
      <Section id='ssh' label={locales.connection_section_ssh}>
        {ssh}
      </Section>
    </Box>
  );
}
