import {
  Body,
  Header,
  HeaderRow,
  Table,
  TableNode,
} from "@table-library/react-table-library";
import { getTheme } from "@table-library/react-table-library/baseline";
import { useSort } from "@table-library/react-table-library/sort";
import { useTheme } from "@table-library/react-table-library/theme";
import { useState } from "react";
import { nodes } from "./data";

import {
  SelectTypes,
  useRowSelect,
} from "@table-library/react-table-library/select";
import CHeaderCell from "./CHeaderCell";
import CRow from "./CRow";

export default function CDataGrid() {
  const [data, setData] = useState({ nodes });

  const theme = useTheme([
    getTheme(),
    {
      HeaderCell: `
        padding-right: 6px;
      `,
      BaseCell: `
         &:not(:last-of-type) {
          border-right: 1px solid #a0a8ae;
        }
      `,
      HeaderRow: `
        .th {
          border-bottom: 1px solid #a0a8ae;
        }
        background-color: #eaf5fd;
      `,
      Row: `
        &:nth-of-type(odd) {
          // background-color: #d2e9fb;
        }

        &:nth-of-type(even) {
          // background-color: #eaf5fd;
        }
      `,
    },
  ]);

  const sort = useSort(
    data,
    {
      onChange: (action: any, state: any) => {
        console.log(action, state);
      },
    },
    {
      sortFns: {
        TASK: (array) => array.sort((a, b) => a.name.localeCompare(b.name)),
        DEADLINE: (array) => array.sort((a, b) => a.deadline - b.deadline),
        TYPE: (array) => array.sort((a, b) => a.type.localeCompare(b.type)),
        COMPLETE: (array) => array.sort((a, b) => a.isComplete - b.isComplete),
        TASKS: (array) =>
          array.sort((a, b) => (a.nodes || []).length - (b.nodes || []).length),
      },
    },
  );
  //

  const handleUpdate = (
    value: unknown,
    id: string | number,
    property: string,
  ) => {
    setData((state) => ({
      ...state,
      nodes: state.nodes.map((node) => {
        if (node.id === id) {
          return { ...node, [property]: value };
        } else {
          return node;
        }
      }),
    }));
  };

  const select = useRowSelect(
    data,
    {
      onChange: (action: any, state: any) => {
        console.log(action, state);
      },
    },
    {
      rowSelect: SelectTypes.SingleSelect,
      buttonSelect: SelectTypes.SingleSelect,
    },
  );

  return (
    <Table
      data={data}
      select={select}
      sort={sort}
      layout={{ horizontalScroll: true }}
    >
      {(tableList: TableNode[]) => (
        <>
          <Header>
            <HeaderRow>
              <CHeaderCell sort={sort} sortKey={"TASK"} />
              <CHeaderCell sort={sort} sortKey={"DEADLINE"} />
              <CHeaderCell sort={sort} sortKey={"TYPE"} />
              <CHeaderCell sort={sort} sortKey={"COMPLETE"} />
              <CHeaderCell sort={sort} sortKey={"TASKS"} />
            </HeaderRow>
          </Header>

          <Body>
            {tableList.map((item: TableNode) => (
              <CRow
                key={item.id}
                item={item}
                select={select}
                onChange={(event: any) => {
                  handleUpdate(event.target.value, item.id, "name");
                  // handleUpdate(
                  //     new Date(event.target.value),
                  //     item.id,
                  //     "deadline",
                  //   )
                }}
              />
            ))}
          </Body>
        </>
      )}
    </Table>
  );
}
