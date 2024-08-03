import { TabMode } from '@/core/enums';
import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { ColumnType } from '@/types';
import { useEffect, useRef } from 'react';
import { ColumnDefinition } from 'react-tabulator';
import { TabulatorFull as Tabulator } from 'tabulator-tables'; //import Tabulator library
import 'tabulator-tables/dist/css/tabulator.min.css'; //import Tabulator stylesheet

export default function DataGrid() {
  const tableElRef = useRef(null);
  const tableRef = useRef<Tabulator>(null);

  const { selectedTab } = useTabStore();

  const {
    loading,
    updateRows,
    updateHighlightedRow,
    getRows,
    getColumns,
    runQuery,
    updateSelectedRows,
    getEditedRows,
    updateEditedRows,
    getUnsavedRows,
    getRemovedRows
  } = useDataStore();

  const getData = async () => {
    await runQuery();

    // const columns = [
    //     { title: "Name", field: "name", width: 150 },
    //     { title: "Age", field: "age", hozAlign: "left", formatter: "progress" },
    //     { title: "Favourite Color", field: "col" },
    //     { title: "Date Of Birth", field: "dob", hozAlign: "center" },
    //     { title: "Rating", field: "rating", hozAlign: "center", formatter: "star" },
    //     { title: "Passed?", field: "passed", hozAlign: "center", formatter: "tickCross" }
    //   ];
    const items: ColumnDefinition[] = [];
    getColumns(false, true).forEach((item: ColumnType) => {
      items.push({
        title: item.name,
        field: item.key,
        editor: true
      });
    });

    /**
     *{
    "key": "datasrc_id",
    "maxWidth": 400,
    "name": "datasrc_id",
    "type": "character",
    "resizable": true,
    "isActive": true,
    "notNull": false,
    "length": 6,
    "comment": "null",
    "default": "null",
    "mappedType": "string",
    "selected": false,
    "editMode": {
        "name": false,
        "default": false,
        "length": false,
        "comment": false
    }
}
     *
     */

    console.log(getColumns()[0]);

    if (tableRef.current) {
      tableRef.current.setColumns(items);
      tableRef.current.setData(getRows());
    }
  };

  const handleRowsChange = (rowIndex, newRow) => {
    const oldRow: any = getRows()[rowIndex];
    const editedRows = handelRowChangeLog(getEditedRows(), oldRow, newRow);
    updateEditedRows(editedRows);

    const rows = getRows();
    rows[rowIndex] = newRow;

    updateRows(rows);
  };

  useEffect(() => {
    if (selectedTab?.mode == TabMode.Data && (getRows().length == 0 || getColumns().length == 0)) {
      getData();
    }
  }, [selectedTab]);

  useEffect(() => {
    if (!tableRef.current) {
      tableRef.current = new Tabulator(tableElRef.current, {
        reactiveData: true,
        resizableRows: true,
        selectableRowsPersistence: false,
        editTriggerEvent: 'dblclick',
        columnDefaults: {
          maxWidth: 400
        },
        rowHeader: {
          headerSort: false,
          resizable: false,
          frozen: true,
          headerHozAlign: 'center',
          hozAlign: 'center',
          formatter: 'rowSelection',
          titleFormatter: 'rowSelection',
          cellClick: function (_: any, cell: any) {
            cell.getRow().toggleSelect();
          }
        }
      });
    }

    tableRef.current.on('rowSelectionChanged', function (_: any, rows: any) {
      updateSelectedRows(rows.map((r: any) => r.getPosition()));
    });

    tableRef.current.on('rowClick', function (e: any, row: any) {
      updateHighlightedRow(row.getData());
    });

    tableRef.current.on('cellEdited', function (cell) {
      handleRowsChange(cell.getRow().getPosition(), cell.getData());
    });
  }, []);

  return <div ref={tableElRef} />;
}
