import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { Grid2, IconButton, Stack, useTheme } from '@mui/material';
import type { JSX } from 'react';

export default function ActionBar({ selectedTab }: { selectedTab: TabType | undefined }): JSX.Element {
  const theme = useTheme();
  const { setShowQueryPreview, setShowFilters, setShowSorts, setShowColumns } = useTabStore();

  const handleToggle = (type: 'filter' | 'query' | 'sort' | 'column'): void => {
    switch (type) {
      case 'filter':
        setShowFilters();
        break;
      case 'query':
        setShowQueryPreview();
        break;
      case 'sort':
        setShowSorts();
        break;
      case 'column':
        setShowColumns();
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
        <IconButton
          className={selectedTab?.showColumns ? 'active' : ''}
          aria-label='grid'
          onClick={(): void => handleToggle('column')}
        >
          <CustomIcon type='grid' size='s' />
        </IconButton>
        <IconButton className={selectedTab?.showFilters ? 'active' : ''} onClick={(): void => handleToggle('filter')}>
          <CustomIcon type='filter' size='s' />
        </IconButton>
        <IconButton
          className={selectedTab?.showSorts ? 'active' : ''}
          aria-label='sort'
          onClick={(): void => handleToggle('sort')}
        >
          <CustomIcon type='sort' size='s' />
        </IconButton>
      </Stack>
      <Grid2 size={{ md: 8 }} display='flex' justifyContent='flex-end'>
        <IconButton
          className={selectedTab?.showQuery ? 'active' : 'toggle-code-preview'}
          onClick={(): void => handleToggle('query')}
        >
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
