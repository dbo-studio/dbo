import DataGrid from '@/components/shared/DBDataGrid/DataGrid.tsx';
import StatusBar from '@/components/shared/StatusBar/StatusBar';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box } from '@mui/material';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';

export default function Data() {
  const { getSelectedTab } = useTabStore();
  const { currentConnection } = useConnectionStore();

  if (!getSelectedTab() || !currentConnection) {
    return <></>;
  }

  return (
    <>
      <ActionBar />
      {getSelectedTab()?.showFilters && <Filters />}
      {getSelectedTab()?.showSorts && <Sorts />}
      {getSelectedTab()?.showQuery && <QueryPreview />}
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {getSelectedTab()?.showColumns && <Columns />}
        <DataGrid editable={true} />
      </Box>
      <StatusBar />
    </>
  );
}
