import type { HotTableRef } from '@handsontable/react-wrapper';
import 'handsontable/dist/handsontable.min.css';

import { DataGridStyled } from '@/components/common/DBDataGrid/DataGrid.styled';
import QuickViewDialog from '@/components/common/DBDataGrid/QuickViewDialog/QuickViewDialog';
import { useHandleContextMenu } from '@/components/common/DBDataGrid/hooks/useHandleContextMenu';
import { useHandleDeselect } from '@/components/common/DBDataGrid/hooks/useHandleDeselect';
import { useHandleRowChange } from '@/components/common/DBDataGrid/hooks/useHandleRowChange';
import { useHandleRowSelect } from '@/components/common/DBDataGrid/hooks/useHandleRowSelect';
import { useHandleRowStyle } from '@/components/common/DBDataGrid/hooks/useHandleRowStyle';
import { useHandleScroll } from '@/components/common/DBDataGrid/hooks/useHandleScroll';
import type { DataGridProps } from '@/components/common/DBDataGrid/types';
import { Box, CircularProgress } from '@mui/material';
import { type JSX, useRef } from 'react';

import { TextCellType, registerCellType } from 'handsontable/cellTypes';

import { TextEditor, registerEditor } from 'handsontable/editors';
import {
  AutoColumnSize,
  AutoRowSize,
  ContextMenu,
  ManualColumnResize,
  TouchScroll,
  TrimRows,
  registerPlugin
} from 'handsontable/plugins';
import { baseRenderer, htmlRenderer, registerRenderer, textRenderer } from 'handsontable/renderers';
import { useHandleDataUpdate } from './hooks/useHandleDataUpdate';

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

export default function DataGrid({ editable, rows, columns, loading }: DataGridProps): JSX.Element {
  const hotTableRef = useRef<HotTableRef | null>(null);

  useHandleScroll({ hotTableRef, rows });
  useHandleDeselect(hotTableRef);
  useHandleDataUpdate({ hotTableRef, rows, columns });
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
        columnSorting={true}
        manualColumnResize={true}
        rowHeaders={false}
        fillHandle={false}
        mergeCells={false}
        manualColumnFreeze={false}
        manualColumnMove={false}
        manualRowMove={false}
        outsideClickDeselects={false}
        readOnly={!editable}
        selectionMode={'multiple'}
        startRows={0}
        startCols={0}
        height='100%'
        width='100%'
        minSpareRows={0}
        contextMenu={handleContextMenu}
        afterSelectionEnd={handleSelection}
        afterChange={editable ? handleRowChange : undefined}
        licenseKey='non-commercial-and-evaluation'
        modifyColWidth={(width: number): number => (width > 400 ? 400 : width)}
        className={'handsontable'}
        cells={(): { renderer: string } => ({ renderer: 'handleRowStyle' })}
      />
    </Box>
  );
}
