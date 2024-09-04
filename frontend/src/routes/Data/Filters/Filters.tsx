import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useCurrentTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import type { FilterType } from '@/types/Tab';
import { Box, Button, type Theme, useTheme } from '@mui/material';
import { v4 as uuid } from 'uuid';
import AddFilterButton from './AddFilterButton';
import FilterItem from './FilterItem';

export default function Filters() {
  const currentTab = useCurrentTab();
  const { getColumns, runQuery } = useDataStore();
  const theme: Theme = useTheme();

  return (
    <Box id='#filters' p={1} borderBottom={`1px solid ${theme.palette.divider}`}>
      {currentTab?.filters.length === 0 ? (
        <AddFilterButton columns={getColumns()} />
      ) : (
        currentTab?.filters.map((filter: FilterType) => {
          return <FilterItem key={uuid()} columns={getColumns()} filter={filter} />;
        })
      )}

      {currentTab && currentTab.filters.length > 0 ? (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button onClick={runQuery} size='small' variant='outlined' endIcon={<CustomIcon type='check' size='xs' />}>
            {locales.apply}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
