import React, { useState } from "react";
import "./index.css";

import { Checkbox } from "@mui/material";
import {
  ColumnDef,
  ColumnResizeMode,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Person, makeData } from "./data";
import DefaultColumn from "./default-column";

export default function DBDataGridReactTable() {
  const [data, setData] = React.useState(() => makeData(10));
  const columns = React.useMemo<ColumnDef<Person>[]>(
    () => [
      {
        size: 70,
        accessorFn: (row) => row.firstName,
        id: "select",
        header: ({ table }) => (
          <Checkbox
            size="small"
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <div className="px-1">
            <Checkbox
              size="small"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              indeterminate={row.getIsSomeSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
        footer: (props) => props.column.id,
      },
      {
        accessorFn: (row) => row.firstName,
        id: "firstName",
        header: () => <span>First Name</span>,
        footer: (props) => props.column.id,
      },
      {
        accessorFn: (row) => row.lastName,
        id: "lastName",
        header: () => <span>Last Name</span>,
        footer: (props) => props.column.id,
      },
      {
        accessorFn: (row) => row.age,
        id: "age",
        header: () => <span>age</span>,
        footer: (props) => props.column.id,
      },
      {
        accessorFn: (row) => row.visits,
        id: "visits",
        header: () => <span>visits</span>,
        footer: (props) => props.column.id,
      },
      {
        accessorFn: (row) => row.progress,
        id: "progress",
        header: () => <span>progress</span>,
        footer: (props) => props.column.id,
      },
      {
        accessorFn: (row) => row.status,
        id: "status",
        header: () => <span>status</span>,
        footer: (props) => props.column.id,
      },
    ],
    [],
  );

  const [columnResizeMode, setColumnResizeMode] =
    useState<ColumnResizeMode>("onChange");
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    defaultColumn: {
      cell: ({ getValue, row, column: { id }, table }) => (
        <DefaultColumn
          initialValue={getValue}
          table={table}
          row={row}
          id={id}
          onSelect={() => row.toggleSelected()}
          selected={row.getIsSelected()}
        />
      ),
    },

    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    meta: {
      updateData: (rowIndex: any, columnId: any, value: any) => {
        setData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...old[rowIndex]!,
                [columnId]: value,
              };
            }
            return row;
          }),
        );
      },
    },
  });

  return (
    <div className="p-2">
      <div className="h-4" />
      <div className="overflow-x-auto">
        <table
          {...{
            style: {
              width: table.getCenterTotalSize(),
            },
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    <div
                      {...{
                        onMouseDown: header.getResizeHandler(),
                        onTouchStart: header.getResizeHandler(),
                        className: `resizer ${
                          header.column.getIsResizing() ? "isResizing" : ""
                        }`,
                        style: {
                          transform:
                            columnResizeMode === "onEnd" &&
                            header.column.getIsResizing()
                              ? `translateX(${
                                  table.getState().columnSizingInfo.deltaOffset
                                }px)`
                              : "",
                        },
                      }}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              return (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
