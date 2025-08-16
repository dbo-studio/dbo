import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import PaginationSetting from './PaginationSetting/PaginationSetting';

export default function StatusBarPagination(): JSX.Element {
  const theme = useTheme();
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const selectedTab = useSelectedTab();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);

  const handlePagination = (mode: 'prev' | 'next'): void => {
    if (!selectedTab || isDataFetching) {
      return;
    }
    const pagination = selectedTab?.pagination ?? { page: 1, limit: 100 };

    if (mode === 'prev') {
      pagination.page = pagination.page - 1;
    }

    if (mode === 'next') {
      pagination.page = pagination.page + 1;
    }

    updateSelectedTab({
      ...(selectedTab ?? ({} as TabType)),
      pagination
    });

    toggleReRunQuery();
  };

  return (
    <Box alignItems={'center'} justifyContent={'flex-end'} display={'flex'} flexDirection={'row'} width={208}>
      {selectedTab?.mode && selectedTab?.mode === TabMode.Data && (
        <>
          <PaginationSetting />
          <IconButton
            style={{ marginLeft: theme.spacing(1) }}
            disabled={selectedTab?.pagination?.page === 1}
            onClick={(): void => handlePagination('prev')}
          >
            <CustomIcon type='chevronLeft' size='s' />
          </IconButton>
          <Typography color={'textText'} fontWeight={'bold'} textAlign={'center'} minWidth={54}>
            {selectedTab?.pagination?.page ?? 1}
          </Typography>
          <IconButton onClick={(): void => handlePagination('next')}>
            <CustomIcon type='chevronRight' size='s' />
          </IconButton>
        </>
      )}
    </Box>
  );
}
