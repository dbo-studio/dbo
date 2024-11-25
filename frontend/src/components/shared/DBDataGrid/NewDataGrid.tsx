import { HotColumn, HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.min.css';
import { TabMode } from '@/core/enums';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { useEffect, useRef } from 'react';
import './index.css';
import { registerAllModules } from 'handsontable/registry';

registerAllModules();

export default function NewDataGrid() {
  const hotTableRef = useRef(null);
  const { getColumns, getRows, runQuery, getSelectedRows, setSelectedRows } = useDataStore();
  const { getSelectedTab } = useTabStore();

  useEffect(() => {
    if (getSelectedTab()?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [getSelectedTab()?.id]);

  const handleSelectionEnd = (rowStart: number, _colStart: number, rowEnd: number, _colEnd: number) => {
    const selectedRows = [];
    for (let i = Math.min(rowStart, rowEnd); i <= Math.max(rowStart, rowEnd); i++) {
      selectedRows.push(i);
    }
    setSelectedRows(selectedRows);
  };

  useEffect(() => {
    const selectedRows = getSelectedRows();
    console.log('Selected Rows:', selectedRows);
  }, [getSelectedRows()]);

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
    >
      {getColumns().map((column) => (
        <HotColumn data={column.key} title={column.name} key={column.key} />
      ))}
    </HotTable>
  );
}
