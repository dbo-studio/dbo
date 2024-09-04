import { TabMode } from '@/core/enums';
import { useCurrentTab } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import PaginationSetting from './PaginationSetting';

export default function StatusBarPagination({ mode }: { mode: TabMode | undefined }) {
  const theme = useTheme();
  const currentTab = useCurrentTab();
  const { updateSelectedTab } = useTabStore();
  const { runQuery, loading } = useDataStore();

  const handlePagination = (mode: 'prev' | 'next') => {
    if (!currentTab || loading) {
      return;
    }
    const pagination = currentTab.pagination;

    if (mode === 'prev') {
      pagination.page = pagination.page - 1;
    }

    if (mode === 'next') {
      pagination.page = pagination.page + 1;
    }

    updateSelectedTab({
      ...currentTab,
      pagination
    });

    runQuery();
  };

  return (
    <Box
      alignItems={'center'}
      mb={'5px'}
      justifyContent={'flex-end'}
      display={'flex'}
      flexDirection={'row'}
      width={208}
    >
      {!mode && mode === TabMode.Data && (
        <>
          <PaginationSetting />
          <IconButton
            style={{ marginLeft: theme.spacing(1) }}
            disabled={currentTab?.pagination?.page === 1}
            onClick={() => handlePagination('prev')}
          >
            <CustomIcon type='arrowLeft' size='s' />
          </IconButton>
          <Typography fontWeight={'bold'} textAlign={'center'} minWidth={54}>
            {currentTab?.pagination?.page ?? 1}
          </Typography>
          <IconButton onClick={() => handlePagination('next')}>
            <CustomIcon type='arrowRight' size='s' />
          </IconButton>
        </>
      )}
    </Box>
  );
}
