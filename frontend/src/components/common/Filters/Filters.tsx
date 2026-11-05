import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useSelectedTab } from '@/hooks/useSelectedTab.ts';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { DataTabType, FilterType } from '@/types/Tab';
import type { ColumnType } from '@/types/Data';
import { Box, Button } from '@mui/material';
import type { JSX } from 'react';
import AddFilterButton from './FilterItem/AddFilterButton/AddFilterButton.tsx';
import FilterItem from './FilterItem/FilterItem.tsx';
import { FiltersApplyBoxStyled } from './Filters.styled';

type FiltersProps = {
  /** Browse tabs pass their own columns and apply handler; Data tabs use the data store. */
  columns?: ColumnType[];
  onApply?: () => void;
};

export default function Filters({ columns: columnsProp, onApply }: FiltersProps = {}): JSX.Element {
  const selectedTab = useSelectedTab<DataTabType>();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const storeColumns = useDataStore((state) => state.columns);
  const columns = columnsProp ?? storeColumns;
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);

  const handleApplyFilters = (): void => {
    if (onApply) {
      onApply();
      return;
    }

    // Read fresh tab — removeFilter runs before apply(); a render closure would restore stale filters.
    const tab = useTabStore.getState().selectedTab<DataTabType>();
    if (tab && (tab.pagination?.page ?? 0) > 1) {
      updateSelectedTab({
        ...tab,
        pagination: { ...(tab.pagination ?? { page: 1, limit: 100 }), page: 1 }
      });
    }

    toggleReRunQuery();
  };

  const filterCount = selectedTab?.filters?.length ?? 0;

  return (
    <Box
      sx={{
        p: 1,
        borderBottom: (theme): string => `1px solid ${theme.palette.divider}`
      }}
    >
      {filterCount === 0 ? (
        <AddFilterButton columns={columns ?? []} />
      ) : (
        selectedTab?.filters?.map((filter: FilterType) => {
          return (
            <FilterItem
              apply={(): void => handleApplyFilters()}
              key={filter.index}
              columns={columns ?? []}
              filter={filter}
            />
          );
        })
      )}
      {filterCount > 0 && (
        <FiltersApplyBoxStyled>
          <Button
            onClick={(): void => handleApplyFilters()}
            size='small'
            variant='outlined'
            endIcon={<CustomIcon type='check' size='xs' />}
          >
            {locales.apply}
          </Button>
        </FiltersApplyBoxStyled>
      )}
    </Box>
  );
}
