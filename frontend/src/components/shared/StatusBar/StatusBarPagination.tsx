import { TabMode } from '@/src/core/enums';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import PaginationSetting from './PaginationSetting';

export default function StatusBarPagination({ mode }: { mode: TabMode | undefined }) {
  const theme = useTheme();
  const { selectedTab, updateSelectedTab } = useTabStore();
  const { runQuery, loading } = useDataStore();

  const handlePagination = (mode: 'prev' | 'next') => {
    if (!selectedTab || loading) {
      return;
    }
    const pagination = selectedTab.pagination;

    if (mode == 'prev') {
      pagination.page = pagination.page - 1;
    }

    if (mode == 'next') {
      pagination.page = pagination.page + 1;
    }

    updateSelectedTab({
      ...selectedTab,
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
      {!mode && mode == TabMode.Data && (
        <>
          <PaginationSetting />
          <IconButton
            style={{ marginLeft: theme.spacing(1) }}
            disabled={selectedTab?.pagination.page == 1}
            onClick={() => handlePagination('prev')}
          >
            <CustomIcon type='arrowLeft' size='s' />
          </IconButton>
          <Typography fontWeight={'bold'} textAlign={'center'} minWidth={54}>
            {selectedTab?.pagination.page}
          </Typography>
          <IconButton onClick={() => handlePagination('next')}>
            <CustomIcon type='arrowRight' size='s' />
          </IconButton>
        </>
      )}
    </Box>
  );
}
