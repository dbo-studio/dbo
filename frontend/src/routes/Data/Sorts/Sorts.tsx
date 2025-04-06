import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import type { SortType } from '@/types';
import { Box, Button } from '@mui/material';
import { type JSX, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import AddSortButton from './SortItem/AddSortButton/AddSortButton.tsx';
import SortItem from './SortItem/SortItem.tsx';

export default function Sorts(): JSX.Element {
  const { getColumns, runQuery } = useDataStore();
  const selectedTab = useSelectedTab();

  const columns = useMemo(() => getColumns(selectedTab), [getColumns(selectedTab), selectedTab]);

  if (!selectedTab) return <></>;

  return (
    <Box id='#sorts' p={1} borderBottom={(theme): string => `1px solid ${theme.palette.divider}`}>
      {selectedTab?.sorts?.length === 0 ? (
        <AddSortButton columns={columns} />
      ) : (
        selectedTab?.sorts?.map((sort: SortType) => {
          return <SortItem key={uuid()} columns={columns} sort={sort} />;
        })
      )}

      {(selectedTab?.sorts?.length ?? 0) > 0 && (
        <Box display='flex' justifyContent='flex-start' mx={1} mt={1}>
          <Button
            onClick={(): Promise<void> => runQuery(selectedTab)}
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
