import { Box } from '@mui/material';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

export default function PanelItem() {
  return (
    <Box overflow='hidden' height={'100%'} display='flex' flexDirection='column'>
      <Suspense>
        <Outlet />
      </Suspense>
    </Box>
  );
}
