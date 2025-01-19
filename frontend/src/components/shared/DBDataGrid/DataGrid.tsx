import { useDataStore } from '@/store/dataStore/data.store.ts';
import { HotColumn, type HotTableRef } from '@handsontable/react-wrapper';
import 'handsontable/dist/handsontable.min.css';

import { DataGridStyled } from '@/components/shared/DBDataGrid/DataGrid.styled.ts';
import { useHandleDataUpdate } from '@/components/shared/DBDataGrid/hooks/useHandleDataUpdate.ts';
import { useHandleDeselect } from '@/components/shared/DBDataGrid/hooks/useHandleDeselect.ts';
import { useHandleRowChange } from '@/components/shared/DBDataGrid/hooks/useHandleRowChange.ts';
import { useHandleRowSelect } from '@/components/shared/DBDataGrid/hooks/useHandleRowSelect.ts';
import { useHandleRowStyle } from '@/components/shared/DBDataGrid/hooks/useHandleRowStyle.ts';
import { useHandleScroll } from '@/components/shared/DBDataGrid/hooks/useHandleScroll.ts';
import { Box, CircularProgress } from '@mui/material';
import { registerAllModules } from 'handsontable/registry';
import { useRef } from 'react';

registerAllModules();

export default function DataGrid() {
  const hotTableRef = useRef<HotTableRef | null>(null);
  const { loading, getRows, getColumns } = useDataStore();

  useHandleScroll(hotTableRef);
  useHandleDeselect(hotTableRef);
  useHandleDataUpdate(hotTableRef);
  useHandleRowStyle();

  const handleSelection = useHandleRowSelect(hotTableRef);
  const handleRowChange = useHandleRowChange();
  // const handleContextMenu = useHandleContextMenu();

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
      // contextMenu={handleContextMenu}
      afterSelectionEnd={handleSelection}
      afterChange={handleRowChange}
      licenseKey='non-commercial-and-evaluation'
      modifyColWidth={(width) => (width > 400 ? 400 : width)}
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
