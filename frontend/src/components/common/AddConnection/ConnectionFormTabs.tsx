import { Box, styled } from '@mui/material';
import type { JSX } from 'react';
import { useState } from 'react';

import { ConnectionFormTabStyled, ConnectionFormTabsRootStyled } from './AddConnection.styled';
import type { ConnectionFormTabId, ConnectionFormTabsProps } from './types';

export default function ConnectionFormTabs({
  general,
  ssl,
  generalLabel,
  sslLabel
}: ConnectionFormTabsProps): JSX.Element {
  const [tab, setTab] = useState<ConnectionFormTabId>('general');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <ConnectionFormTabsRootStyled role='tablist'>
        <ConnectionFormTabStyled
          role='tab'
          tabIndex={0}
          data-testid='connection-tab-general'
          selected={tab === 'general'}
          isLast={false}
          aria-selected={tab === 'general'}
          onClick={(): void => setTab('general')}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setTab('general');
            }
          }}
        >
          {generalLabel}
        </ConnectionFormTabStyled>
        <ConnectionFormTabStyled
          role='tab'
          tabIndex={0}
          data-testid='connection-tab-ssl'
          selected={tab === 'ssl'}
          isLast
          aria-selected={tab === 'ssl'}
          onClick={(): void => setTab('ssl')}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setTab('ssl');
            }
          }}
        >
          {sslLabel}
        </ConnectionFormTabStyled>
      </ConnectionFormTabsRootStyled>
      <ConnectionFormTabPanelStyled sx={{ display: tab === 'general' ? 'flex' : 'none' }}>
        {general}
      </ConnectionFormTabPanelStyled>
      <ConnectionFormTabPanelStyled sx={{ display: tab === 'ssl' ? 'flex' : 'none' }}>
        {ssl}
      </ConnectionFormTabPanelStyled>
    </Box>
  );
}

const ConnectionFormTabPanelStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingTop: theme.spacing(1.5),
  display: 'flex',
  flexDirection: 'column'
}));
