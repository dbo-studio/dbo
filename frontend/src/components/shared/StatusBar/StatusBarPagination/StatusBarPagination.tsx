import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import PaginationSetting from './PaginationSetting/PaginationSetting';

export default function StatusBarPagination() {
  const theme = useTheme();
  const { updateSelectedTab } = useTabStore();
  const { runQuery, loading } = useDataStore();
  const selectedTab = useSelectedTab();

  const handlePagination = (mode: 'prev' | 'next') => {
    if (!selectedTab || loading) {
      return;
    }
    const pagination = selectedTab?.pagination ?? { page: 0, limit: 100, offset: 0 };

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

    runQuery().then();
  };

  return (
    <Box alignItems={'center'} justifyContent={'flex-end'} display={'flex'} flexDirection={'row'} width={208}>
      {selectedTab?.mode && selectedTab?.mode === TabMode.Data && (
        <>
          <PaginationSetting />
          <IconButton
            style={{ marginLeft: theme.spacing(1) }}
            disabled={selectedTab?.pagination?.page === 1}
            onClick={() => handlePagination('prev')}
          >
            <CustomIcon type='arrowLeft' size='s' />
          </IconButton>
          <Typography color={'textText'} fontWeight={'bold'} textAlign={'center'} minWidth={54}>
            {selectedTab?.pagination?.page ?? 1}
          </Typography>
          <IconButton onClick={() => handlePagination('next')}>
            <CustomIcon type='arrowRight' size='s' />
          </IconButton>
        </>
      )}
    </Box>
  );
}
