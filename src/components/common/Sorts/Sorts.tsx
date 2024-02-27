import { useUUID } from '@/src/hooks';
import locales from '@/src/locales';
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
  const uuids = useUUID(selectedTab?.sorts.length);

  return (
    <Box id='#sorts' p={1} borderBottom={`1px solid ${theme.palette.divider}`}>
      {selectedTab?.sorts.length == 0 ? (
        <AddSortButton />
      ) : (
        uuids.length > 0 &&
        selectedTab?.sorts.map((sort: SortType, index: number) => {
          return <SortItem key={uuids[index]} columns={getColumns()} sort={sort} />;
        })
      )}

      {selectedTab && selectedTab.sorts.length > 0 ? (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button size='small' variant='outlined' endIcon={<CustomIcon type='check' size='xs' />}>
            {locales.apply}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
