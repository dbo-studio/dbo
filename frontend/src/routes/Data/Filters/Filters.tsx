import type { RunQueryResponseType } from '@/api/query/types.ts';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook.ts';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { FilterType } from '@/types/Tab';
import { Box, Button } from '@mui/material';
import type { JSX } from 'react';
import { v4 as uuid } from 'uuid';
import AddFilterButton from './FilterItem/AddFilterButton/AddFilterButton.tsx';
import FilterItem from './FilterItem/FilterItem.tsx';

export default function Filters(): JSX.Element {
  const selectedTab = useSelectedTab();

  const columns = useDataStore((state) => state.columns);
  const runQuery = useDataStore((state) => state.runQuery);

  return (
    <Box id='#filters' p={1} borderBottom={(theme): string => `1px solid ${theme.palette.divider}`}>
      {selectedTab?.filters?.length === 0 ? (
        <AddFilterButton columns={columns ?? []} />
      ) : (
        selectedTab?.filters?.map((filter: FilterType) => {
          return <FilterItem key={uuid()} columns={columns ?? []} filter={filter} />;
        })
      )}

      {(selectedTab?.filters?.length ?? 0) > 0 && (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button
            onClick={(): Promise<RunQueryResponseType | undefined> => runQuery()}
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
