import { TabMode } from '@/core/enums';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import PaginationSetting from './PaginationSetting/PaginationSetting';

export default function StatusBarPagination() {
  const theme = useTheme();
  const { updateSelectedTab, getSelectedTab } = useTabStore();
  const { runQuery, loading } = useDataStore();

  const handlePagination = (mode: 'prev' | 'next') => {
    if (!getSelectedTab() || loading) {
      return;
    }
    const pagination = getSelectedTab()?.pagination ?? { page: 0, limit: 100, offset: 0 };

    if (mode === 'prev') {
      pagination.page = pagination.page - 1;
    }

    if (mode === 'next') {
      pagination.page = pagination.page + 1;
    }

    updateSelectedTab({
      ...(getSelectedTab() ?? ({} as TabType)),
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
      {getSelectedTab()?.mode && getSelectedTab()?.mode === TabMode.Data && (
        <>
          <PaginationSetting />
          <IconButton
            style={{ marginLeft: theme.spacing(1) }}
            disabled={getSelectedTab()?.pagination?.page === 1}
            onClick={() => handlePagination('prev')}
          >
            <CustomIcon type='arrowLeft' size='s' />
          </IconButton>
          <Typography fontWeight={'bold'} textAlign={'center'} minWidth={54}>
            {getSelectedTab()?.pagination?.page ?? 1}
          </Typography>
          <IconButton onClick={() => handlePagination('next')}>
            <CustomIcon type='arrowRight' size='s' />
          </IconButton>
        </>
      )}
    </Box>
  );
}
