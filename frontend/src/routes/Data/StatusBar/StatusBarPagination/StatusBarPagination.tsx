import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType, EditorTabType, TabType } from '@/types';
import { IconButton, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import PaginationSetting from './PaginationSetting/PaginationSetting';
import { PageNumberStyled, StatusBarPaginationStyled } from './StatusBarPagination.styled';

export default function StatusBarPagination(): JSX.Element {
  const { isMobile } = useLayoutMode();
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const rows = useDataStore((state) => state.rows);
  const selectedTab = useSelectedTab();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);

  const isQueryMode = selectedTab?.mode === TabMode.Query;

  const pagination = (selectedTab as DataTabType | EditorTabType | undefined)?.pagination ?? { page: 1, limit: 100 };
  const nextDisabled = isDataFetching || (isQueryMode && (rows?.length ?? 0) < pagination.limit);

  const handlePagination = (mode: 'prev' | 'next'): void => {
    if (!selectedTab || isDataFetching) {
      return;
    }

    const nextPagination = {
      page: mode === 'prev' ? Math.max(1, pagination.page - 1) : pagination.page + 1,
      limit: pagination.limit
    };

    updateSelectedTab({
      ...(selectedTab as TabType),
      pagination: nextPagination
    } as TabType);

    if (isQueryMode) {
      void runRawQuery();
      return;
    }

    toggleReRunQuery();
  };

  return (
    <StatusBarPaginationStyled mobile={isMobile}>
      <PaginationSetting />
      <Tooltip title={locales.previous_page}>
        <IconButton
          aria-label={locales.previous_page}
          disabled={pagination.page === 1 || isDataFetching}
          onClick={(): void => handlePagination('prev')}
        >
          <CustomIcon type='chevronLeft' size='s' />
        </IconButton>
      </Tooltip>
      <PageNumberStyled mobile={isMobile} color='textText'>
        {pagination.page}
      </PageNumberStyled>
      <Tooltip title={locales.next_page}>
        <IconButton
          aria-label={locales.next_page}
          disabled={nextDisabled}
          onClick={(): void => handlePagination('next')}
        >
          <CustomIcon type='chevronRight' size='s' />
        </IconButton>
      </Tooltip>
    </StatusBarPaginationStyled>
  );
}
