import { useUUID } from '@/hooks';
import locales from '@/locales';
import { Box, useTheme } from '@mui/material';
import { Suspense, lazy, useState } from 'react';
import { DesignTabWrapperStyled } from './DesignTab.styled';
import DesignTabItem from './DesignTabItem';
import type { DesignTabTypes } from './types';

const Columns = lazy(() => import('../Columns/Columns'));

const tabs: DesignTabTypes[] = [
  {
    id: 0,
    name: locales.columns,
    icon: 'grid',
    iconActive: 'gridBlue',
    component: <Columns />
  }
];

export default function DesignTabs() {
  const theme = useTheme();
  const [mode, setMode] = useState(0);
  const uuids = useUUID(2);

  return (
    <DesignTabWrapperStyled>
      <Box borderRight={`1px solid ${theme.palette.divider}`}>
        {tabs.map((tabItem, index) => (
          <DesignTabItem
            selected={mode === tabItem.id}
            tab={tabItem}
            onClick={() => setMode(tabItem.id)}
            key={uuids[index]}
          />
        ))}
      </Box>

      <Suspense>{tabs[mode].component}</Suspense>
    </DesignTabWrapperStyled>
  );
}
