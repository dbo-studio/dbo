import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks';
import { Box } from '@mui/material';
import { type JSX, Suspense, lazy } from 'react';

const Data = lazy(() => import('@/routes/Data/Data'));
const Query = lazy(() => import('@/routes/Query/Query'));
const ObjectForm = lazy(() => import('@/routes/ObjectForm/ObjectForm'));

export default function PanelItem(): JSX.Element {
  const selectedTab = useSelectedTab();
  if (!selectedTab) return <></>;

  return (
    <Box overflow='hidden' height={'100%'} display='flex' flexDirection='column'>
      {selectedTab ? (
        <Suspense>
          {selectedTab.mode === TabMode.Data && <Data />}
          {selectedTab.mode === TabMode.Query && <Query />}
          {selectedTab.mode === TabMode.Object && <ObjectForm />}
          {selectedTab.mode === TabMode.ObjectDetail && <ObjectForm isDetail={true} />}
        </Suspense>
      ) : null}
    </Box>
  );
}
