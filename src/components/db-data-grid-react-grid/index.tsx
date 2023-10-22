import { useEffect, useState } from "react";
import DataGrid, {
  ColumnOrColumnGroup,
  SelectColumn,
  textEditor,
} from "react-data-grid";
import { ServerColumn, makeData } from "./makeData";
import "./styles.css";

export default function DBDataGrid() {
  const [selectedRows, setSelectedRows] = useState(
    (): ReadonlySet<number> => new Set(),
  );

  const [rows, setRows] = useState<readonly unknown[]>([]);
  const [columns, setColumns] = useState<
    readonly ColumnOrColumnGroup<any, unknown>[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const data = makeData(250);
      setRows(data.rows);
      setColumns(getColumns(data.columns));
      setIsLoading(false);
    }, 0);
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
      rowHeight={30}
      onRowsChange={setRows}
    />
  );
}

function rowKeyGetter(row: any) {
  return row.id;
}
