import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { DataTabType, SortType } from '@/types';
import { Box, Button } from '@mui/material';
import type { JSX } from 'react';
import AddSortButton from './SortItem/AddSortButton/AddSortButton.tsx';
import SortItem from './SortItem/SortItem.tsx';
import { SortsApplyBoxStyled } from './Sorts.styled';

export default function Sorts(): JSX.Element {
  const selectedTab = useSelectedTab<DataTabType>();
  const columns = useDataStore((state) => state.columns);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);

  const handleApplySorts = (): void => {
    const tab = useTabStore.getState().selectedTab<DataTabType>();
    if (tab && (tab.pagination?.page ?? 0) > 1) {
      updateSelectedTab({
        ...tab,
        pagination: { ...(tab.pagination ?? { page: 1, limit: 100 }), page: 1 }
      });
    }

    toggleReRunQuery();
  };

  if (!selectedTab) return <></>;

  const sortCount = selectedTab.sorts?.length ?? 0;

  return (
    <Box
      sx={{
        p: 1,
        borderBottom: (theme): string => `1px solid ${theme.palette.divider}`
      }}
    >
      {sortCount === 0 ? (
        <AddSortButton columns={columns ?? []} />
      ) : (
        selectedTab.sorts?.map((sort: SortType) => {
          return <SortItem key={sort.index} columns={columns ?? []} sort={sort} />;
        })
      )}
      {sortCount > 0 && (
        <SortsApplyBoxStyled>
          <Button
            onClick={(): void => handleApplySorts()}
            size='small'
            variant='outlined'
            endIcon={<CustomIcon type='check' size='xs' />}
          >
            {locales.apply}
          </Button>
        </SortsApplyBoxStyled>
      )}
    </Box>
  );
}
