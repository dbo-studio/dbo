import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { SortType } from '@/src/types';
import { Box, Button, Theme, useTheme } from '@mui/material';
import { v4 as uuid } from 'uuid';
import CustomIcon from '../../../../../base/CustomIcon/CustomIcon';
import AddSortButton from './AddSortButton';
import SortItem from './SortItem';

export default function Sorts() {
  const { selectedTab } = useTabStore();
  const { getColumns, runQuery } = useDataStore();
  const theme: Theme = useTheme();

  return (
    <Box id='#sorts' p={1} borderBottom={`1px solid ${theme.palette.divider}`}>
      {selectedTab?.sorts.length == 0 ? (
        <AddSortButton columns={getColumns()} />
      ) : (
        selectedTab?.sorts.map((sort: SortType) => {
          return <SortItem key={uuid()} columns={getColumns()} sort={sort} />;
        })
      )}

      {selectedTab && selectedTab.sorts.length > 0 ? (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button onClick={runQuery} size='small' variant='outlined' endIcon={<CustomIcon type='check' size='xs' />}>
            {locales.apply}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
