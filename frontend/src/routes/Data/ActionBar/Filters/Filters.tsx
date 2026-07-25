import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { tools } from '@/core/utils/tools.ts';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook.ts';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { DataTabType, FilterType, TabType } from '@/types/Tab';
import { Box, Button } from '@mui/material';
import type { JSX } from 'react';
import AddFilterButton from './FilterItem/AddFilterButton/AddFilterButton.tsx';
import FilterItem from './FilterItem/FilterItem.tsx';
import { FiltersApplyBoxStyled } from './Filters.styled';

export default function Filters(): JSX.Element {
  const selectedTab = useSelectedTab<DataTabType>();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const columns = useDataStore((state) => state.columns);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);

  const handleApplyFilters = (): void => {
    if (selectedTab?.pagination?.page ?? 0 > 1) {
      const pagination = selectedTab?.pagination ?? { page: 1, limit: 100 };
      pagination.page = 1;
      updateSelectedTab({
        ...(selectedTab ?? ({} as TabType)),
        pagination
      });
    }

    toggleReRunQuery();
  };

  return (
    <Box
      sx={{
        p: 1,
        borderBottom: (theme): string => `1px solid ${theme.palette.divider}`
      }}
    >
      {selectedTab?.filters?.length === 0 ? (
        <AddFilterButton columns={columns ?? []} />
      ) : (
        selectedTab?.filters?.map((filter: FilterType) => {
          return (
            <FilterItem
              apply={(): void => handleApplyFilters()}
              key={tools.uuid()}
              columns={columns ?? []}
              filter={filter}
            />
          );
        })
      )}
      {(selectedTab?.filters?.length ?? 0) > 0 && (
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
