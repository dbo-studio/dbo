import { useTabStore } from '@/src/store/tabStore/tab.store';
import { IconButton, Stack, useTheme } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import CustomIcon from '../../../../../base/CustomIcon/CustomIcon';

export default function ActionBar() {
  const theme = useTheme();
  const { selectedTab, setShowQueryPreview, setShowFilters, setShowSorts, setShowColumns } = useTabStore();

  const handleToggle = (type: 'filter' | 'query' | 'sort' | 'column') => {
    switch (type) {
      case 'filter':
        setShowFilters(!selectedTab!.showFilters);
        break;
      case 'query':
        setShowQueryPreview(!selectedTab!.showQuery);
        break;
      case 'sort':
        setShowSorts(!selectedTab!.showSorts);
        break;
      case 'column':
        setShowColumns(!selectedTab!.showColumns);
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
      <Grid md={8} display='flex' justifyContent='flex-start'>
        <IconButton color='secondary' aria-label='grid' onClick={() => handleToggle('column')}>
          <CustomIcon type='columnFillGreen' size='m' />
        </IconButton>
        <IconButton className='toggle-filters' onClick={() => handleToggle('filter')}>
          <CustomIcon type='filterBrown' size='m' />
        </IconButton>
        <IconButton aria-label='sort' onClick={() => handleToggle('sort')}>
          <CustomIcon type='sortBlue' size='m' />
        </IconButton>
      </Grid>
      <Grid md={8} mx={2} display='flex' justifyContent='flex-end'>
        <IconButton className='toggle-code-preview' onClick={() => handleToggle('query')}>
          <CustomIcon type='code' size='s' />
        </IconButton>
        <IconButton aria-label='export'>
          <CustomIcon type='export' size='s' />
        </IconButton>
        <IconButton aria-label='import'>
          <CustomIcon type='import' size='s' />
        </IconButton>
      </Grid>
    </Stack>
  );
}
