import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType, TabType } from '@/types';
import { IconButton, type Theme, useMediaQuery, useTheme } from '@mui/material';
import type { JSX } from 'react';
import PaginationSetting from './PaginationSetting/PaginationSetting';
import { PageNumberStyled, StatusBarPaginationStyled } from './StatusBarPagination.styled';

export default function StatusBarPagination(): JSX.Element {
  const theme = useTheme();
  const matches = useMediaQuery((theme: Theme) => theme.breakpoints.up('sm'));
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const selectedTab = useSelectedTab<DataTabType>();
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
    <StatusBarPaginationStyled visible={matches}>
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
          <PageNumberStyled color={'textText'}>{selectedTab?.pagination?.page ?? 1}</PageNumberStyled>
          <IconButton onClick={(): void => handlePagination('next')}>
            <CustomIcon type='chevronRight' size='s' />
          </IconButton>
        </>
      )}
    </StatusBarPaginationStyled>
  );
}
