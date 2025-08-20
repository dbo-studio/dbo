import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { ExportModal } from '@/components/common/ExportModal/ExportButton';
import { ImportModal } from '@/components/common/ImportModal/ImportButton';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Grid, IconButton, Stack, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import Filters from '../Filters/Filters';
import QueryPreview from '../QueryPreview/QueryPreview';
import Sorts from '../Sorts/Sorts';
import type { ActionBarProps } from './types';

export default function ActionBar({ showColumns, setShowColumns }: ActionBarProps): JSX.Element {
  const theme = useTheme();
  const [showExport, setShowExport] = useState({
    show: false,
    connectionId: 0,
    query: '',
    table: ''
  });
  const [showImport, setShowImport] = useState({
    show: false,
    connectionId: 0,
    table: ''
  });

  const handleShowExport = () => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    const table = useTabStore.getState().selectedTab()?.table ?? 'exported_table';
    const query = useTabStore.getState().selectedTab()?.query ?? '';

    setShowExport({
      show: true,
      connectionId: currentConnectionId as number,
      query: query,
      table: table
    });
  };

  const handleShowImport = () => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    const table = useTabStore.getState().selectedTab()?.table ?? 'exported_table';

    setShowImport({
      show: true,
      connectionId: currentConnectionId as number,
      table: table
    });
  };

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
        <Grid size={{ md: 8 }} display='flex' justifyContent='flex-end'>
          <IconButton aria-label='export' onClick={handleShowExport}>
            <CustomIcon type='export' size='s' />
          </IconButton>

          <IconButton aria-label='import' onClick={handleShowImport}>
            <CustomIcon type='import' size='s' />
          </IconButton>

          <IconButton
            className={show.showQuery ? 'active' : 'toggle-code-preview'}
            onClick={(): void => handleToggle('query')}
          >
            <CustomIcon type='code' size='s' />
          </IconButton>
        </Grid>
      </Stack>

      <ExportModal
        onClose={() => setShowExport({ ...showExport, show: false })}
        show={showExport.show}
        connectionId={showExport.connectionId}
        query={showExport.query}
        table={showExport.table}
      />
      <ImportModal
        onClose={() => setShowImport({ ...showImport, show: false })}
        show={showImport.show}
        connectionId={showImport.connectionId}
        table={showImport.table}
      />

      {show.showFilters && <Filters />}
      {show.showSorts && <Sorts />}
      {show.showQuery && <QueryPreview />}
    </Box>
  );
}
