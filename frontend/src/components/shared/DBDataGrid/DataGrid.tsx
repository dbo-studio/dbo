import { TabMode } from '@/core/enums';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { HotColumn, type HotTableClass } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.min.css';
import { DataGridStyled } from '@/components/shared/DBDataGrid/DataGrid.styled.ts';
import { useHandleDeselect } from '@/components/shared/DBDataGrid/hooks/useHandleDeselect.ts';
import { useHandleRowChange } from '@/components/shared/DBDataGrid/hooks/useHandleRowChange.ts';
import { useHandleRowSelect } from '@/components/shared/DBDataGrid/hooks/useHandleRowSelect.ts';
import { useHandleRowStyle } from '@/components/shared/DBDataGrid/hooks/useHandleRowStyle.ts';
import { useHandleScroll } from '@/components/shared/DBDataGrid/hooks/useHandleScroll.ts';
import { Box, CircularProgress } from '@mui/material';
import { registerAllModules } from 'handsontable/registry';
import { useEffect, useRef } from 'react';

registerAllModules();

export default function DataGrid() {
  const hotTableRef = useRef<HotTableClass>(null);
  useHandleScroll(hotTableRef);
  useHandleRowChange(hotTableRef);
  useHandleRowSelect(hotTableRef);
  useHandleDeselect(hotTableRef);
  useHandleRowStyle();

  const { loading, getColumns, getRows, runQuery, getEditedRows, getRemovedRows, getUnsavedRows } = useDataStore();
  const { getSelectedTab } = useTabStore();

  useEffect(() => {
    if (getSelectedTab()?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [getSelectedTab()?.id]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.render();
  }, [getRemovedRows(), getUnsavedRows(), getEditedRows()]);

  if (loading) {
    return (
      <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <DataGridStyled
      ref={hotTableRef}
      data={getRows()}
      rowHeaders={true}
      fillHandle={false}
      mergeCells={false}
      manualColumnFreeze={false}
      manualColumnMove={false}
      manualRowMove={false}
      selectionMode={'multiple'}
      startRows={0}
      startCols={0}
      height='100%'
      width='100%'
      manualColumnResize={true}
      outsideClickDeselects={false}
      minSpareRows={0}
      licenseKey='non-commercial-and-evaluation'
      modifyColWidth={(width) => {
        if (width > 400) return 400;
      }}
      className={'handsontable'}
      cells={() => {
        return { renderer: 'handleRowStyle' };
      }}
      columnSorting={true}
    >
      {getColumns().map((column) => (
        <HotColumn data={column.key} title={column.name} key={column.key} />
      ))}
    </DataGridStyled>
  );
}
