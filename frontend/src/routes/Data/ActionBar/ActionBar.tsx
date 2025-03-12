import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Grid2, IconButton, Stack, useTheme } from '@mui/material';
import { useMemo } from 'react';

export default function ActionBar() {
  const theme = useTheme();
  const { setShowQueryPreview, setShowFilters, setShowSorts, setShowColumns } = useTabStore();
  const { getSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);

  const handleToggle = (type: 'filter' | 'query' | 'sort' | 'column') => {
    switch (type) {
      case 'filter':
        setShowFilters(!selectedTab?.showFilters);
        break;
      case 'query':
        setShowQueryPreview(!selectedTab?.showQuery);
        break;
      case 'sort':
        setShowSorts(!selectedTab?.showSorts);
        break;
      case 'column':
        setShowColumns(!selectedTab?.showColumns);
        break;
    }
  };

  return (
    <Stack
      id='action-bar'
      borderBottom={`1px solid ${theme.palette.divider}`}
      borderTop={`1px solid ${theme.palette.divider}`}
      padding=' 8px'
      maxHeight={40}
      direction='row'
      justifyContent='space-between'
      alignItems='center'
    >
      <Stack direction={'row'} spacing={1} display='flex' justifyContent='flex-start'>
        <IconButton aria-label='grid' onClick={() => handleToggle('column')}>
          <CustomIcon type='grid' size='s' />
        </IconButton>
        <IconButton className='toggle-filters' onClick={() => handleToggle('filter')}>
          <CustomIcon type='filter' size='s' />
        </IconButton>
        <IconButton aria-label='sort' onClick={() => handleToggle('sort')}>
          <CustomIcon type='sort' size='s' />
        </IconButton>
      </Stack>
      <Grid2 size={{ md: 8 }} display='flex' justifyContent='flex-end'>
        <IconButton className='toggle-code-preview' onClick={() => handleToggle('query')}>
          <CustomIcon type='code' size='s' />
        </IconButton>
        {/* <IconButton aria-label='export'>
          <CustomIcon type='export' size='s' />
        </IconButton>
        <IconButton aria-label='import'>
          <CustomIcon type='import' size='s' />
        </IconButton> */}
      </Grid2>
    </Stack>
  );
}
