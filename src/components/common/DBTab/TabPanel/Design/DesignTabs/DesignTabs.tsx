import { tools } from '@/src/core/utils';
import { useUUID } from '@/src/hooks';
import locales from '@/src/locales';
import { Box, useTheme } from '@mui/material';
import { useState } from 'react';
import Columns from '../Columns/Columns';
import { DesignTabWrapperStyled } from './DesignTab.styled';
import DesignTabItem from './DesignTabItem';
import { DesignTabTypes } from './types';

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
      <Box
        borderRight={`1px solid ${theme.palette.divider}`}
        height={tools.screenMaxHeight()}
        maxHeight={tools.screenMaxHeight()}
      >
        {tabs.map((tabItem, index) => (
          <DesignTabItem
            selected={mode === tabItem.id}
            tab={tabItem}
            onClick={() => setMode(tabItem.id)}
            key={uuids[index]}
          />
        ))}
      </Box>

      {tabs[mode].component}
    </DesignTabWrapperStyled>
  );
}
