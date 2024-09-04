import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useCurrentTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { SortType } from '@/types';
import { Box, Button, Theme, useTheme } from '@mui/material';
import { v4 as uuid } from 'uuid';
import AddSortButton from './AddSortButton';
import SortItem from './SortItem';

export default function Sorts() {
  const currentTab = useCurrentTab();
  const { getColumns, runQuery } = useDataStore();
  const theme: Theme = useTheme();

  return (
    <Box id='#sorts' p={1} borderBottom={`1px solid ${theme.palette.divider}`}>
      {currentTab?.sorts.length == 0 ? (
        <AddSortButton columns={getColumns()} />
      ) : (
        currentTab?.sorts.map((sort: SortType) => {
          return <SortItem key={uuid()} columns={getColumns()} sort={sort} />;
        })
      )}

      {currentTab && currentTab.sorts.length > 0 ? (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button onClick={runQuery} size='small' variant='outlined' endIcon={<CustomIcon type='check' size='xs' />}>
            {locales.apply}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
