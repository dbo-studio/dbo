import PaginationControls from '@/components/common/DataGridStatusBar/PaginationControls';
import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType, EditorTabType } from '@/types';
import type { JSX } from 'react';

export default function StatusBarPagination(): JSX.Element {
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const rows = useDataStore((state) => state.rows);
  const selectedTab = useSelectedTab();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);

  const isQueryMode = selectedTab?.mode === TabMode.Query;
  const pagination = (selectedTab as DataTabType | EditorTabType | undefined)?.pagination ?? { page: 1, limit: 100 };

  const go = (next: { page: number; limit: number }): void => {
    if (!selectedTab || isDataFetching) return;
    updateSelectedTab({ ...selectedTab, pagination: next });
    if (isQueryMode) {
      void runRawQuery();
      return;
    }
    toggleReRunQuery();
  };

  return (
    <PaginationControls
      page={pagination.page}
      limit={pagination.limit}
      disabled={isDataFetching}
      canNext={!(isQueryMode && (rows?.length ?? 0) < pagination.limit)}
      onPrev={(): void => go({ page: Math.max(1, pagination.page - 1), limit: pagination.limit })}
      onNext={(): void => go({ page: pagination.page + 1, limit: pagination.limit })}
      onLimit={(limit): void => go({ page: pagination.page, limit })}
    />
  );
}
