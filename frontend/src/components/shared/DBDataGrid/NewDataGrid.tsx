import { HotColumn, HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.min.css';
import { TabMode } from '@/core/enums';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { registerAllModules } from 'handsontable/registry';
import { useEffect } from 'react';
import './index.css';

registerAllModules();

export default function NewDataGrid() {
  const { getColumns, getRows, runQuery } = useDataStore();
  const { getSelectedTab } = useTabStore();

  useEffect(() => {
    if (getSelectedTab()?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [getSelectedTab()?.id]);

  return (
    <HotTable
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
    >
      {getColumns().map((column) => (
        <HotColumn data={column.key} title={column.name} key={column.key} />
      ))}
    </HotTable>
  );
}
