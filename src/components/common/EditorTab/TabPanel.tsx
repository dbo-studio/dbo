import { useTabStore } from '@/src/store/tabStore/tab.store';
import { TabMode, TabType } from '@/src/types';
import { Box } from '@mui/material';
import ActionBar from '../ActionBar/ActionBar';
import Columns from '../Columns/Columns';
import DBDataGrid from '../DBDataGrid/DBDataGrid';
import DBStructure from '../DBStructure/DBStructure';
import Filters from '../Filters/Filters';
import QueryEditor from '../QueryEditor/QueryEditor';
import QueryEditorActionBar from '../QueryEditorActionBar/QueryEditorActionBar';
import QueryPreview from '../QueryPreview/QueryPreview';
import Sorts from '../Sorts/Sorts';
import StatusBar from '../StatusBar/StatusBar';

export default function TabPanel() {
  const { selectedTab } = useTabStore();
  return (
    <Box overflow='hidden' height={'100%'} display='flex' flexDirection='column'>
      {selectedTab ? (
        <>
          {selectedTab.mode == TabMode.Data && DataMode(selectedTab)}
          {selectedTab.mode == TabMode.Structure && StructureMode()}
          {selectedTab.mode == TabMode.Query && QueryMode()}
        </>
      ) : null}
    </Box>
  );
}

function DataMode(selectedTab: TabType) {
  return (
    <>
      <ActionBar />
      {selectedTab.showFilters && <Filters />}
      {selectedTab.showSorts && <Sorts />}
      {selectedTab.showQuery && <QueryPreview />}
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {selectedTab.showColumns && <Columns />}
        <DBDataGrid />
      </Box>
      <StatusBar />
    </>
  );
}

function StructureMode() {
  return (
    <>
      <DBStructure />
      <StatusBar />
    </>
  );
}

function QueryMode() {
  return (
    <>
      <QueryEditorActionBar />
      <QueryEditor />
    </>
  );
}
