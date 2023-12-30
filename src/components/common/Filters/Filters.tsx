import { useAppStore } from '@/src/store/zustand';
import { FilterType } from '@/src/types/Tab';
import { Box, Button } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import AddFilterButton from './AddFilterButton';
import FilterItem from './FilterItem';

export default function Filters() {
  const { selectedTab } = useAppStore();

  return (
    <Box p={1}>
      {selectedTab?.filters.length == 0 ? (
        <AddFilterButton filterLength={selectedTab.filters.length} />
      ) : (
        selectedTab?.filters.map((filter: FilterType) => {
          return (
            <FilterItem
              key={filter.index}
              columns={selectedTab.columns}
              filterLength={selectedTab.filters.length}
              filter={filter}
            />
          );
        })
      )}

      {selectedTab && selectedTab.filters.length > 0 ? (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button size='small' variant='outlined' endIcon={<CustomIcon type='check' size='xs' />}>
            Apply
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
