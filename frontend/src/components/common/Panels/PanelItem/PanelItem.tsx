import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks';
import Data from '@/routes/Data/Data';
import ObjectForm from '@/routes/ObjectForm/ObjectForm';
import Query from '@/routes/Query/Query';
import { Box } from '@mui/material';
import type { JSX } from 'react';

export default function PanelItem(): JSX.Element {
  const selectedTab = useSelectedTab();
  if (!selectedTab) return <></>;

  return (
    <Box overflow='hidden' height={'100%'} display='flex' flexDirection='column'>
      {selectedTab
        ? (selectedTab.mode === TabMode.Data && <Data />) ||
          (selectedTab.mode === TabMode.Query && <Query />) ||
          (selectedTab.mode === TabMode.Object && <ObjectForm isDetail={false} />) ||
          (selectedTab.mode === TabMode.ObjectDetail && <ObjectForm isDetail={true} />)
        : null}
    </Box>
  );
}
