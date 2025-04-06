import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Grid2, IconButton, Stack, useTheme } from '@mui/material';
import type { JSX } from 'react';

export default function ActionBar(): JSX.Element {
  const theme = useTheme();
  const { setShowQueryPreview, setShowFilters, setShowSorts, setShowColumns } = useTabStore();
  const selectedTab = useSelectedTab();

  const handleToggle = (type: 'filter' | 'query' | 'sort' | 'column'): void => {
    if (!selectedTab) return;

    switch (type) {
      case 'filter':
        setShowFilters(selectedTab);
        break;
      case 'query':
        setShowQueryPreview(selectedTab);
        break;
      case 'sort':
        setShowSorts(selectedTab);
        break;
      case 'column':
        setShowColumns(selectedTab);
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
        <IconButton aria-label='grid' onClick={(): void => handleToggle('column')}>
          <CustomIcon type='grid' size='s' />
        </IconButton>
        <IconButton className='toggle-filters' onClick={(): void => handleToggle('filter')}>
          <CustomIcon type='filter' size='s' />
        </IconButton>
        <IconButton aria-label='sort' onClick={(): void => handleToggle('sort')}>
          <CustomIcon type='sort' size='s' />
        </IconButton>
      </Stack>
      <Grid2 size={{ md: 8 }} display='flex' justifyContent='flex-end'>
        <IconButton className='toggle-code-preview' onClick={(): void => handleToggle('query')}>
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
