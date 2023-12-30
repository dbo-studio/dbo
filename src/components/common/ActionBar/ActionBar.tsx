import { useAppStore } from '@/src/store/zustand';
import { IconButton, Stack, useTheme } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function ActionBar() {
  const theme = useTheme();
  const { selectedTab, setShowQueryPreview, setShowFilters } = useAppStore();

  const handleShowQueryPreview = () => {
    setShowQueryPreview(!selectedTab!.showQuery);
  };

  const handleShowFilters = () => {
    setShowFilters(!selectedTab!.showFilters);
  };

  return (
    <Stack
      borderBottom={`1px solid ${theme.palette.divider}`}
      borderTop={`1px solid ${theme.palette.divider}`}
      padding='0 8px'
      maxHeight={40}
      direction='row'
      justifyContent='space-between'
      alignItems='center'
    >
      <Grid md={8} display='flex' justifyContent='flex-start'>
        <IconButton color='secondary' aria-label='grid'>
          <CustomIcon type='columnFillGreen' size='m' />
        </IconButton>
        <IconButton aria-label='filter' onClick={handleShowFilters}>
          <CustomIcon type='filterBrown' size='m' />
        </IconButton>
        <IconButton aria-label='sort'>
          <CustomIcon type='sortBlue' size='m' />
        </IconButton>
      </Grid>
      <Grid md={8} mx={2} display='flex' justifyContent='flex-end'>
        <IconButton aria-label='code' onClick={handleShowQueryPreview}>
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
