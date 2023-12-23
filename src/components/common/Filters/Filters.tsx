import { useAppStore } from '@/src/store/zustand';
import { FilterType } from '@/src/types/Tab';
import { Box } from '@mui/material';
import AddFilterButton from './AddFilterButton';
import FilterItem from './FilterItem';

export default function Filters() {
  const { selectedTab } = useAppStore();

  return (
    <Box minHeight='100px' p={1}>
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
    </Box>
  );
}
