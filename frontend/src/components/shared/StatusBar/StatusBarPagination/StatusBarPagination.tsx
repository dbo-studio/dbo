import { TabMode } from '@/core/enums';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import PaginationSetting from './PaginationSetting/PaginationSetting';
import type { BaseProp } from '@/types';

export default function StatusBarPagination({ tab }: BaseProp) {
  const theme = useTheme();
  const { updateSelectedTab } = useTabStore();
  const { runQuery, loading } = useDataStore();

  const handlePagination = (mode: 'prev' | 'next') => {
    if (!tab || loading) {
      return;
    }
    const pagination = tab.pagination;

    if (mode === 'prev') {
      pagination.page = pagination.page - 1;
    }

    if (mode === 'next') {
      pagination.page = pagination.page + 1;
    }

    updateSelectedTab({
      ...tab,
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
      {!tab?.mode && tab?.mode === TabMode.Data && (
        <>
          <PaginationSetting />
          <IconButton
            style={{ marginLeft: theme.spacing(1) }}
            disabled={tab?.pagination?.page === 1}
            onClick={() => handlePagination('prev')}
          >
            <CustomIcon type='arrowLeft' size='s' />
          </IconButton>
          <Typography fontWeight={'bold'} textAlign={'center'} minWidth={54}>
            {tab?.pagination?.page ?? 1}
          </Typography>
          <IconButton onClick={() => handlePagination('next')}>
            <CustomIcon type='arrowRight' size='s' />
          </IconButton>
        </>
      )}
    </Box>
  );
}
