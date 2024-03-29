import { tools } from '@/src/core/utils';
import { useUUID } from '@/src/hooks';
import locales from '@/src/locales';
import { Box, Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import Columns from './Columns/Columns';
import { DesignTabTypes } from './types';

const tabs: DesignTabTypes[] = [
  {
    id: 0,
    name: locales.columns,
    icon: 'grid',
    iconActive: 'gridBlue',
    component: <Columns />
  },
  {
    id: 1,
    name: locales.columns,
    icon: 'grid',
    iconActive: 'gridBlue',
    component: <Columns />
  },
  {
    id: 2,
    name: locales.columns,
    icon: 'grid',
    iconActive: 'gridBlue',
    component: <Columns />
  },
  {
    id: 3,
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
    <Box mb={'5px'} display={'flex'}>
      <Box
        padding={theme.spacing(1)}
        borderRight={`1px solid ${theme.palette.divider}`}
        height={tools.screenMaxHeight()}
        maxHeight={tools.screenMaxHeight()}
        minHeight={tools.screenMaxHeight()}
        overflow={'auto'}
        display={'flex'}
        flexDirection={'column'}
      >
        {tabs.map((tabItem, index) => (
          <Typography onClick={() => setMode(tabItem.id)} key={uuids[index]}>
            {tabItem.name}
          </Typography>
        ))}
      </Box>

      {tabs[mode].component}
    </Box>
  );
}
