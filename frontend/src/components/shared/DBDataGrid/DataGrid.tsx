import {useDataStore} from '@/store/dataStore/data.store.ts';
import {HotColumn, type HotTableRef} from '@handsontable/react-wrapper';
import 'handsontable/dist/handsontable.min.css';

import {DataGridStyled} from '@/components/shared/DBDataGrid/DataGrid.styled.ts';
import QuickViewDialog from '@/components/shared/DBDataGrid/QuickViewDialog/QuickViewDialog.tsx';
import {useHandleContextMenu} from '@/components/shared/DBDataGrid/hooks/useHandleContextMenu.ts';
import {useHandleDataUpdate} from '@/components/shared/DBDataGrid/hooks/useHandleDataUpdate.ts';
import {useHandleDeselect} from '@/components/shared/DBDataGrid/hooks/useHandleDeselect.ts';
import {useHandleRowChange} from '@/components/shared/DBDataGrid/hooks/useHandleRowChange.ts';
import {useHandleRowSelect} from '@/components/shared/DBDataGrid/hooks/useHandleRowSelect.ts';
import {useHandleRowStyle} from '@/components/shared/DBDataGrid/hooks/useHandleRowStyle.ts';
import {useHandleScroll} from '@/components/shared/DBDataGrid/hooks/useHandleScroll.ts';
import type {DataGridProps} from '@/components/shared/DBDataGrid/types.ts';
import {Box, CircularProgress} from '@mui/material';
import {useMemo, useRef} from 'react';

import {registerCellType, TextCellType} from 'handsontable/cellTypes';

import type {ColumnType} from '@/types';
import {registerEditor, TextEditor} from 'handsontable/editors';
import {
    AutoColumnSize,
    AutoRowSize,
    ContextMenu,
    ManualColumnResize,
    registerPlugin,
    TouchScroll,
    TrimRows
} from 'handsontable/plugins';
import {baseRenderer, htmlRenderer, registerRenderer, textRenderer} from 'handsontable/renderers';

registerRenderer(baseRenderer);
registerRenderer(textRenderer);
registerRenderer(htmlRenderer);
registerEditor(TextEditor);
registerCellType(TextCellType);

registerPlugin(ManualColumnResize);
registerPlugin(TrimRows);
registerPlugin(TouchScroll);
registerPlugin(AutoRowSize);
registerPlugin(AutoColumnSize);
registerPlugin(ContextMenu);

export default function DataGrid({ editable }: DataGridProps) {
  const hotTableRef = useRef<HotTableRef | null>(null);
  const { loading, getRows, getColumns } = useDataStore();

  const rows = useMemo(() => getRows(), [getRows()]);
  const headers = useMemo(() => getColumns(true), [getColumns()]);

  useHandleScroll(hotTableRef);
  useHandleDeselect(hotTableRef);
  useHandleDataUpdate(hotTableRef);
  useHandleRowStyle();

  const handleSelection = useHandleRowSelect(hotTableRef);
  const handleRowChange = useHandleRowChange();
  const handleContextMenu = useHandleContextMenu(editable);

  if (loading) {
    return (
      <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <QuickViewDialog editable={editable} />
      <DataGridStyled
        ref={hotTableRef}
        data={rows}
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
        contextMenu={handleContextMenu}
        afterSelectionEnd={handleSelection}
        readOnly={!editable}
        afterChange={editable ? handleRowChange : undefined}
        licenseKey='non-commercial-and-evaluation'
        modifyColWidth={(width) => (width > 400 ? 400 : width)}
        className={'handsontable'}
        cells={() => {
          return { renderer: 'handleRowStyle' };
        }}
        columnSorting={true}
      >
        {headers.map((column: ColumnType) => (
          <HotColumn data={column.key} title={column.name} key={column.key} />
        ))}
      </DataGridStyled>
    </Box>
  );
}
