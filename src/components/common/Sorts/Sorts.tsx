import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { SortType } from '@/src/types/Tab';
import { Box, Button, Theme, useTheme } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import AddSortButton from './AddSortButton';
import SortItem from './SortItem';

export default function Sorts() {
  const { selectedTab } = useTabStore();
  const { getColumns } = useDataStore();
  const theme: Theme = useTheme();

  return (
    <Box id='#sorts' p={1} borderBottom={`1px solid ${theme.palette.divider}`}>
      {selectedTab?.sorts.length == 0 ? (
        <AddSortButton sortLength={selectedTab.sorts.length} />
      ) : (
        selectedTab?.sorts.map((sort: SortType) => {
          return <SortItem key={sort.index} columns={getColumns()} sortLength={selectedTab.sorts.length} sort={sort} />;
        })
      )}

      {selectedTab && selectedTab.sorts.length > 0 ? (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button size='small' variant='outlined' endIcon={<CustomIcon type='check' size='xs' />}>
            Apply
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
