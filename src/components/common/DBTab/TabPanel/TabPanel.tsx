import { useTabStore } from '@/src/store/tabStore/tab.store';
import { TabMode } from '@/src/types';
import { Box } from '@mui/material';
import dynamic from 'next/dynamic';

const Data = dynamic(() => import('./Data/Data'), {
  ssr: false
});
const Query = dynamic(() => import('./Query/Query'), {
  ssr: false
});

const Structure = dynamic(() => import('./Structure/Structure'), {
  ssr: false
});

export default function TabPanel() {
  const { selectedTab } = useTabStore();
  return (
    <Box overflow='hidden' height={'100%'} display='flex' flexDirection='column'>
      {selectedTab ? (
        <>
          {selectedTab.mode == TabMode.Data && <Data />}
          {selectedTab.mode == TabMode.Structure && <Structure />}
          {selectedTab.mode == TabMode.Query && <Query />}
        </>
      ) : null}
    </Box>
  );
}
