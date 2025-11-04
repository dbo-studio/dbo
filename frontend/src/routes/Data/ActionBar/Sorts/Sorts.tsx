import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { SortType, TabType } from '@/types';
import { Box, Button } from '@mui/material';
import type { JSX } from 'react';
import { v4 as uuid } from 'uuid';
import AddSortButton from './SortItem/AddSortButton/AddSortButton.tsx';
import SortItem from './SortItem/SortItem.tsx';

export default function Sorts(): JSX.Element {
  const selectedTab = useSelectedTab();
  const columns = useDataStore((state) => state.columns);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);

  const handleApplySorts = (): void => {
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


  if (!selectedTab) return <></>;

  return (
    <Box p={1} borderBottom={(theme): string => `1px solid ${theme.palette.divider}`}>
      {selectedTab?.sorts?.length === 0 ? (
        <AddSortButton columns={columns ?? []} />
      ) : (
        selectedTab?.sorts?.map((sort: SortType) => {
          return <SortItem key={uuid()} columns={columns ?? []} sort={sort} />;
        })
      )}

      {(selectedTab?.sorts?.length ?? 0) > 0 && (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button
            onClick={(): void => handleApplySorts()}
            size='small'
            variant='outlined'
            endIcon={<CustomIcon type='check' size='xs' />}
          >
            {locales.apply}
          </Button>
        </Box>
      )}
    </Box>
  );
}
