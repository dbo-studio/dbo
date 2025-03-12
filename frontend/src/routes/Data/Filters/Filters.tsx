import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { FilterType } from '@/types/Tab';
import { Box, Button } from '@mui/material';
import { useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import AddFilterButton from './FilterItem/AddFilterButton/AddFilterButton.tsx';
import FilterItem from './FilterItem/FilterItem.tsx';

export default function Filters() {
  const { getColumns, runQuery } = useDataStore();
  const { getSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);

  return (
    <Box id='#filters' p={1} borderBottom={(theme) => `1px solid ${theme.palette.divider}`}>
      {selectedTab?.filters.length === 0 ? (
        <AddFilterButton columns={getColumns()} />
      ) : (
        selectedTab?.filters.map((filter: FilterType) => {
          return <FilterItem key={uuid()} columns={getColumns()} filter={filter} />;
        })
      )}

      {(selectedTab?.filters?.length ?? 0) > 0 && (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button onClick={runQuery} size='small' variant='outlined' endIcon={<CustomIcon type='check' size='xs' />}>
            {locales.apply}
          </Button>
        </Box>
      )}
    </Box>
  );
}
