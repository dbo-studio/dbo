import BottomSheet from '@/components/base/BottomSheet/BottomSheet';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import { haptics } from '@/core/tauri/haptics';
import ListSkeleton from '@/components/base/ListSkeleton/ListSkeleton';
import PullIndicator from '@/components/base/PullIndicator/PullIndicator';
import ScreenHeader from '@/components/base/ScreenHeader/ScreenHeader';
import { useConnectionTabs, useDataTabLoader, usePullToRefresh, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import StatusBarPagination from '@/routes/Data/StatusBar/StatusBarPagination/StatusBarPagination';
import { useDataStore } from '@/store/dataStore/data.store';
import type { ColumnType, DataTabType, RowType } from '@/types';
import { Badge, Button, CircularProgress, IconButton, LinearProgress, Typography, useTheme } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';
import Columns from '../Columns/Columns';
import DataGrid from '../DataGrid/DataGrid';
import { useDataGridRowActions } from '../DataGrid/hooks/useDataGridRowActions';
import { useRowStateLookup } from '../DataGrid/hooks/useRowStateLookup';
import { useSaveGridChanges } from '../DataGrid/hooks/useSaveGridChanges';
import Filters from '../Filters/Filters';
import Sorts from '../Sorts/Sorts';
import TabSwitcherSheet from '../TabSwitcherSheet/TabSwitcherSheet';
import {
  MobileTableDataBodyStyled,
  MobileTableDataCardsStyled,
  MobileTableDataFabStyled,
  MobileTableDataFooterStyled,
  MobileTableDataPaginationStyled,
  MobileTableDataSectionTitleStyled,
  MobileTableDataStyled
} from './MobileTableData.styled';
import RowCard from './RowCard/RowCard';
import RowEditSheet from './RowEditSheet/RowEditSheet';
import type { MobileTableDataView } from './types';

const EMPTY_ROWS: RowType[] = [];
const EMPTY_COLUMNS: ColumnType[] = [];

export default function MobileTableData(): JSX.Element {
  const theme = useTheme();
  const selectedTab = useSelectedTab<DataTabType>();
  const tabs = useConnectionTabs();
  const loading = useDataTabLoader();
  const rows = useDataStore((state) => state.rows ?? EMPTY_ROWS);
  const allColumns = useDataStore((state) => state.columns ?? EMPTY_COLUMNS);
  const columns = useMemo(() => allColumns.filter((c) => c.isActive), [allColumns]);
  const { getRowState, editedRowsSet, removedRowsSet, unsavedRowsSet } = useRowStateLookup();
  const { canEditGrid, addRow, discardChanges, refreshOrStop, isDataFetching } = useDataGridRowActions();
  const { save, saving } = useSaveGridChanges();

  const [view, setView] = useState<MobileTableDataView>('cards');
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);
  const [sheet, setSheet] = useState<'filters' | 'tabs' | undefined>(undefined);
  // The grid view scrolls internally, so only the card list is pull-to-refresh.
  const { bind: pullBind, pull, progress } = usePullToRefresh(refreshOrStop, view === 'cards' && !isDataFetching);

  const pendingCount = editedRowsSet.size + removedRowsSet.size + unsavedRowsSet.size;
  const filterCount =
    (selectedTab?.filters?.filter((f) => f.isActive).length ?? 0) +
    (selectedTab?.sorts?.filter((s) => s.isActive).length ?? 0);
  const editingRow = editingIndex === undefined ? undefined : rows.find((r) => r.dbo_index === editingIndex);

  const handleAddRow = async (): Promise<void> => {
    await addRow();
    const unsaved = useDataStore.getState().unSavedRows;
    const added = unsaved[unsaved.length - 1] as RowType | undefined;
    if (added) {
      setEditingIndex(added.dbo_index);
    }
  };

  const renderBody = (): JSX.Element => {
    if (columns.length === 0) {
      return loading ? (
        <ListSkeleton />
      ) : (
        <EmptyState icon='grid' title={locales.data_empty_title} description={locales.data_empty_description} />
      );
    }

    if (view === 'grid') {
      return <DataGrid rows={rows} columns={columns} loading={loading} editable={selectedTab?.editable} />;
    }

    return (
      <MobileTableDataCardsStyled>
        {rows.map((row, index) => (
          <RowCard
            key={row.dbo_index}
            row={row}
            columns={columns}
            state={getRowState(row.dbo_index, index)}
            onClick={(): void => setEditingIndex(row.dbo_index)}
          />
        ))}
        {!loading && rows.length === 0 && <EmptyState icon='grid' title={locales.data_empty_title} />}
      </MobileTableDataCardsStyled>
    );
  };

  return (
    <MobileTableDataStyled>
      <ScreenHeader
        title={selectedTab?.table ?? selectedTab?.name ?? ''}
        actions={
          <>
            <IconButton aria-label={locales.mobile_open_tabs} onClick={(): void => setSheet('tabs')}>
              <Badge badgeContent={tabs.length} color='primary'>
                <CustomIcon type='copy' size='m' />
              </Badge>
            </IconButton>
            <IconButton aria-label={locales.filters} onClick={(): void => setSheet('filters')}>
              <Badge badgeContent={filterCount} color='secondary' variant='dot'>
                <CustomIcon type='filter' size='m' />
              </Badge>
            </IconButton>
            <IconButton
              aria-label={view === 'cards' ? locales.mobile_view_grid : locales.mobile_view_cards}
              onClick={(): void => setView(view === 'cards' ? 'grid' : 'cards')}
            >
              <CustomIcon type={view === 'cards' ? 'grid' : 'layoutList'} size='m' />
            </IconButton>
          </>
        }
      />
      {loading && <LinearProgress />}

      <MobileTableDataBodyStyled {...pullBind}>
        <PullIndicator pull={pull} progress={progress} />
        {renderBody()}
      </MobileTableDataBodyStyled>

      <MobileTableDataFooterStyled>
        {pendingCount > 0 ? (
          <>
            <Typography variant='body2' sx={{ flex: 1 }}>
              {pendingCount} {locales.mobile_pending_changes}
            </Typography>
            <Button onClick={(): void => void discardChanges()} disabled={saving}>
              {locales.discard_changes}
            </Button>
            <Button
              variant='contained'
              onClick={(): void => {
                void haptics.impact();
                void save();
              }}
              loading={saving}
            >
              {locales.save}
            </Button>
          </>
        ) : (
          <>
            <IconButton aria-label={locales.refresh} onClick={refreshOrStop}>
              {isDataFetching ? <CircularProgress size={16} /> : <CustomIcon type='refresh' size='s' />}
            </IconButton>
            <MobileTableDataPaginationStyled>
              <StatusBarPagination />
            </MobileTableDataPaginationStyled>
          </>
        )}
      </MobileTableDataFooterStyled>

      {canEditGrid && view === 'cards' && pendingCount === 0 && (
        <MobileTableDataFabStyled
          color='primary'
          aria-label={locales.add_row}
          onClick={(): void => void handleAddRow()}
        >
          <CustomIcon type='plus' size='m' color={theme.palette.primary.contrastText} />
        </MobileTableDataFabStyled>
      )}

      {editingRow && (
        <RowEditSheet
          key={editingRow.dbo_index}
          row={editingRow}
          columns={columns}
          editable={canEditGrid}
          onClose={(): void => setEditingIndex(undefined)}
        />
      )}
      {sheet === 'tabs' && <TabSwitcherSheet onClose={(): void => setSheet(undefined)} />}
      {sheet === 'filters' && (
        <BottomSheet open fullHeight onClose={(): void => setSheet(undefined)} title={locales.filters}>
          <Filters />
          <MobileTableDataSectionTitleStyled>{locales.sorts}</MobileTableDataSectionTitleStyled>
          <Sorts />
          <MobileTableDataSectionTitleStyled>{locales.columns}</MobileTableDataSectionTitleStyled>
          <Columns />
        </BottomSheet>
      )}
    </MobileTableDataStyled>
  );
}
