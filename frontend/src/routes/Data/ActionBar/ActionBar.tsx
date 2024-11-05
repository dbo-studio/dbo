import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Grid2, IconButton, Stack, useTheme } from '@mui/material';

export default function ActionBar() {
  const theme = useTheme();
  const { setShowQueryPreview, setShowFilters, setShowSorts, setShowColumns } = useTabStore();
  const { getSelectedTab } = useTabStore();

  const handleToggle = (type: 'filter' | 'query' | 'sort' | 'column') => {
    switch (type) {
      case 'filter':
        setShowFilters(!getSelectedTab()?.showFilters);
        break;
      case 'query':
        setShowQueryPreview(!getSelectedTab()?.showQuery);
        break;
      case 'sort':
        setShowSorts(!getSelectedTab()?.showSorts);
        break;
      case 'column':
        setShowColumns(!getSelectedTab()?.showColumns);
        break;
    }
  };

  return (
    <Stack
      id='action-bar'
      borderBottom={`1px solid ${theme.palette.divider}`}
      borderTop={`1px solid ${theme.palette.divider}`}
      padding='0 8px'
      maxHeight={40}
      direction='row'
      justifyContent='space-between'
      alignItems='center'
    >
      <Grid2 size={{ md: 8 }} display='flex' justifyContent='flex-start'>
        <IconButton color='secondary' aria-label='grid' onClick={() => handleToggle('column')}>
          <CustomIcon type='grid' size='s' />
        </IconButton>
        <IconButton className='toggle-filters' onClick={() => handleToggle('filter')}>
          <CustomIcon type='filter' size='s' />
        </IconButton>
        <IconButton aria-label='sort' onClick={() => handleToggle('sort')}>
          <CustomIcon type='sort' size='s' />
        </IconButton>
      </Grid2>
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
