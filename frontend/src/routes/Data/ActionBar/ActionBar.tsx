import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Grid, { GridItem } from '@/components/base/Grid/Grid';
import { ExportModal } from '@/components/common/ExportModal/ExportModal';
import { ImportModal } from '@/components/common/ImportModal/ImportModal';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { DataTabType } from '@/types';
import { Badge, Box, IconButton, Tooltip, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import Filters from './Filters/Filters';
import InlineQuery from './InlineQuery/InlineQuery';
import QueryPreview from './QueryPreview/QueryPreview';
import Sorts from './Sorts/Sorts';
import type { ActionBarProps } from './types';

export default function ActionBar({ showColumns, setShowColumns }: ActionBarProps): JSX.Element {
  const theme = useTheme();
  const selectedTab = useSelectedTab<DataTabType>();

  const sortCount = selectedTab?.sorts?.filter((sort) => sort.isActive).length ?? 0;
  const filterCount = selectedTab?.filters?.filter((filter) => filter.isActive).length ?? 0;

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
    const table = useTabStore.getState().selectedTab<DataTabType>()?.table ?? 'exported_table';
    const query = useTabStore.getState().getQuery() ?? '';

    setShowExport({
      show: true,
      connectionId: currentConnectionId as number,
      query: query,
      table: table
    });
  };

  const handleShowImport = () => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    const table = useTabStore.getState().selectedTab<DataTabType>()?.table ?? 'exported_table';

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
      <Grid
        borderBottom={`1px solid ${theme.palette.divider}`}
        borderTop={`1px solid ${theme.palette.divider}`}
        padding='8px'
        minHeight={40}
        gap={1}
        templateColumns={{
          xs: 'minmax(0, 1fr) max-content'
        }}
      >
        <GridItem minWidth={0}>
          <InlineQuery />
        </GridItem>
        <GridItem
          display='flex'
          alignItems='center'
          justifyContent='flex-end'
          flexWrap='nowrap'
          flexShrink={0}
          gap={0.5}
        >
          <Tooltip title={locales.filters}>
            <IconButton className={show.showFilters ? 'active' : ''} onClick={(): void => handleToggle('filter')}>
              <Badge badgeContent={filterCount} color='secondary' variant='dot'>
                <CustomIcon type='filter' size='s' />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={locales.sorts}>
            <IconButton
              className={show.showSorts ? 'active' : ''}
              aria-label='sort'
              onClick={(): void => handleToggle('sort')}
            >
              <Badge badgeContent={sortCount} color='secondary' variant='dot'>
                <CustomIcon type='sort' size='s' />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={locales.columns}>
            <IconButton
              className={showColumns ? 'active' : ''}
              aria-label='grid'
              onClick={(): void => handleToggle('column')}
            >
              <CustomIcon type='grid' size='s' />
            </IconButton>
          </Tooltip>

          <Tooltip title={locales.export}>
            <IconButton aria-label='export' onClick={handleShowExport}>
              <CustomIcon type='export' size='s' />
            </IconButton>
          </Tooltip>

          <Tooltip title={locales.import}>
            <IconButton aria-label='import' onClick={handleShowImport}>
              <CustomIcon type='import' size='s' />
            </IconButton>
          </Tooltip>

          <Tooltip title={locales.query_preview}>
            <IconButton
              className={show.showQuery ? 'active' : 'toggle-code-preview'}
              onClick={(): void => handleToggle('query')}
            >
              <CustomIcon type='code' size='s' />
            </IconButton>
          </Tooltip>
        </GridItem>
      </Grid>

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
