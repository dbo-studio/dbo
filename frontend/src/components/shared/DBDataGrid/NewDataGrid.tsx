import { TabMode } from '@/core/enums';
import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { HotColumn, HotTable, type HotTableClass } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.min.css';
import { registerAllModules } from 'handsontable/registry';
import { useEffect, useRef } from 'react';
import './index.css';

registerAllModules();

export default function NewDataGrid() {
  const hotTableRef = useRef<HotTableClass>(null);
  const { getColumns, getRows, runQuery, setSelectedRows, getEditedRows, updateEditedRows, updateRows } =
    useDataStore();
  const { getSelectedTab } = useTabStore();

  useEffect(() => {
    if (getSelectedTab()?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [getSelectedTab()?.id]);

  const handleSelectionEnd = (rowStart: number, _colStart: number, rowEnd: number, _colEnd: number) => {
    const hot = hotTableRef?.current?.hotInstance;
    if (!hot) {
      return;
    }
    const selectedRows = [];
    for (let i = Math.min(rowStart, rowEnd); i <= Math.max(rowStart, rowEnd); i++) {
      const rowData = hot.getSourceDataAtRow(i); // Fetch row data
      selectedRows.push({ index: i, data: rowData });
    }

    setSelectedRows(selectedRows);
  };

  const handleChange = (changes: any[] | null, _: any) => {
    if (!changes || changes.length === 0) return;
    for (const [row, prop, oldValue, newValue] of changes) {
      if (oldValue === newValue) continue;
      const rows = getRows();
      const editedRows = handelRowChangeLog(getEditedRows(), rows, row, prop, oldValue, newValue);
      updateEditedRows(editedRows);
      updateRows(rows);
    }
  };

  return (
    <HotTable
      ref={hotTableRef}
      rowHeaders={true}
      fillHandle={false}
      mergeCells={false}
      manualColumnFreeze={false}
      manualColumnMove={false}
      manualRowMove={false}
      selectionMode={'multiple'}
      data={getRows()}
      startRows={0}
      startCols={0}
      height='100%'
      width='100%'
      manualColumnResize={true}
      minSpareRows={0}
      licenseKey='non-commercial-and-evaluation'
      modifyColWidth={(width) => {
        if (width > 400) {
          return 400;
        }
      }}
      className={'handsontable'}
      afterSelectionEnd={handleSelectionEnd}
      afterChange={handleChange}
    >
      {getColumns().map((column) => (
        <HotColumn data={column.key} title={column.name} key={column.key} />
      ))}
    </HotTable>
  );
}
