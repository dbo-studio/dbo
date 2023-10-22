import { useEffect, useState } from "react";
import DataGrid, { SelectColumn, textEditor } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { ServerColumn, makeData } from "./makeData";

export default function DBDataGridReactGrid() {
  const [selectedRows, setSelectedRows] = useState(
    (): ReadonlySet<number> => new Set(),
  );

  const [rows, setRows] = useState();
  const [columns, setColumns] = useState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const data = makeData(250);
      setRows(data.rows);
      setColumns(getColumns(data.columns));
      setIsLoading(false);
    }, 3000);
  }, []);

  function getColumns(serverColumns: ServerColumn[]): any {
    const arr = [SelectColumn];
    serverColumns!.forEach((column: ServerColumn) => {
      arr.push({
        key: column.felid,
        name: column.felid,
        resizable: true,
        renderEditCell: textEditor,
      });
    });

    return arr;
  }

  return isLoading ? (
    <span>Loading</span>
  ) : (
    <DataGrid
      rowKeyGetter={rowKeyGetter}
      selectedRows={selectedRows}
      onSelectedRowsChange={setSelectedRows}
      columns={columns}
      rows={rows}
      rowHeight={22}
      onRowsChange={setRows}
    />
  );
}

function rowKeyGetter(row: any) {
  return row.id;
}
