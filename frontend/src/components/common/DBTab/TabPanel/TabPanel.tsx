import { TabMode } from '@/core/enums';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { lazy } from 'react';

const Data = lazy(() => import('./Data/Data'));
const Query = lazy(() => import('./Query/Query'));

const Design = lazy(() => import('./Design/Design'));

export default function TabPanel() {
  const { selectedTab } = useTabStore();
  return (
    <Box overflow='hidden' height={'100%'} display='flex' flexDirection='column'>
      {selectedTab ? (
        <>
          {selectedTab.mode == TabMode.Data && <Data />}
          {selectedTab.mode == TabMode.Design && <Design />}
          {selectedTab.mode == TabMode.Query && <Query />}
        </>
      ) : null}
    </Box>
  );
}
