import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, Grid2, IconButton, Stack, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import Filters from '../Filters/Filters';
import QueryPreview from '../QueryPreview/QueryPreview';
import Sorts from '../Sorts/Sorts';
import type { ActionBarProps } from './types';

export default function ActionBar({ showColumns, setShowColumns }: ActionBarProps): JSX.Element {
  const theme = useTheme();
  const [show, setShow] = useState({
    showFilters: false,
    showSorts: false,
    showQuery: false
  });

  const handleToggle = (type: 'filter' | 'query' | 'sort' | 'column'): void => {
    switch (type) {
      case 'filter':
        setShow({
          showFilters: !show.showFilters,
          showSorts: false,
          showQuery: false
        });
        break;
      case 'query':
        setShow({
          showFilters: false,
          showSorts: false,
          showQuery: !show.showQuery
        });
        break;
      case 'sort':
        setShow({
          showFilters: false,
          showSorts: !show.showSorts,
          showQuery: false
        });
        break;
      case 'column':
        setShowColumns(!showColumns);
        break;
    }
  };

  return (
    <Box>
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
            className={showColumns ? 'active' : ''}
            aria-label='grid'
            onClick={(): void => handleToggle('column')}
          >
            <CustomIcon type='grid' size='s' />
          </IconButton>
          <IconButton className={show.showFilters ? 'active' : ''} onClick={(): void => handleToggle('filter')}>
            <CustomIcon type='filter' size='s' />
          </IconButton>
          <IconButton
            className={show.showSorts ? 'active' : ''}
            aria-label='sort'
            onClick={(): void => handleToggle('sort')}
          >
            <CustomIcon type='sort' size='s' />
          </IconButton>
        </Stack>
        <Grid2 size={{ md: 8 }} display='flex' justifyContent='flex-end'>
          <IconButton
            className={show.showQuery ? 'active' : 'toggle-code-preview'}
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

      {show.showFilters && <Filters />}
      {show.showSorts && <Sorts />}
      {show.showQuery && <QueryPreview />}
    </Box>
  );
}
