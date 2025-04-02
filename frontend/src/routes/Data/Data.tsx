import DataGrid from '@/components/shared/DBDataGrid/DataGrid.tsx';
import StatusBar from '@/components/shared/StatusBar/StatusBar';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import { Box } from '@mui/material';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';

export default function Data() {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();

  if (!selectedTab || !currentConnection) {
    return <></>;
  }

  return (
    <>
      <ActionBar />
      {selectedTab?.showFilters && <Filters />}
      {selectedTab?.showSorts && <Sorts />}
      {selectedTab?.showQuery && <QueryPreview />}
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {selectedTab?.showColumns && <Columns />}
        <DataGrid editable={true} />
      </Box>
      <StatusBar />
    </>
  );
}
