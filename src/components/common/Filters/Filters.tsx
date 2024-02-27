import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { FilterType } from '@/src/types/Tab';
import { Box, Button, Theme, useTheme } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import AddFilterButton from './AddFilterButton';
import FilterItem from './FilterItem';

export default function Filters() {
  const { selectedTab } = useTabStore();
  const { getColumns } = useDataStore();
  const theme: Theme = useTheme();

  return (
    <Box id='#filters' p={1} borderBottom={`1px solid ${theme.palette.divider}`}>
      {selectedTab?.filters.length == 0 ? (
        <AddFilterButton />
      ) : (
        selectedTab?.filters.map((filter: FilterType) => {
          return <FilterItem key={filter.index} columns={getColumns()} filter={filter} />;
        })
      )}

      {selectedTab && selectedTab.filters.length > 0 ? (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button size='small' variant='outlined' endIcon={<CustomIcon type='check' size='xs' />}>
            {locales.apply}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
