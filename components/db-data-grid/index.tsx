import {
  Body,
  Header,
  HeaderRow,
  Row,
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
import CHeaderSelect from "./CHeaderSelect";
import CRowCell from "./CRowCell";
import CRowSelect from "./CRowSelect";

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
      rowSelect: SelectTypes.MultiSelect,
      buttonSelect: SelectTypes.MultiSelect,
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
              <CHeaderSelect select={select} />
              <CHeaderCell sort={sort} sortKey={"TASK"} />
              <CHeaderCell sort={sort} sortKey={"DEADLINE"} />
              <CHeaderCell sort={sort} sortKey={"TYPE"} />
              <CHeaderCell sort={sort} sortKey={"COMPLETE"} />
              <CHeaderCell sort={sort} sortKey={"TASKS"} />
            </HeaderRow>
          </Header>

          <Body>
            {tableList.map((item: TableNode) => (
              <Row key={item.id} item={item}>
                <CRowSelect select={select} id={item.id} />
                <CRowCell
                  value={item.name}
                  id={item.id}
                  type={"text"}
                  onChange={(event: any) =>
                    handleUpdate(event.target.value, item.id, "name")
                  }
                />
                <CRowCell
                  value={item.deadline.toISOString().substr(0, 10)}
                  id={item.id}
                  type={"date"}
                  onChange={(event: any) =>
                    handleUpdate(
                      new Date(event.target.value),
                      item.id,
                      "deadline",
                    )
                  }
                />
                <CRowCell
                  value={item.type}
                  id={item.id}
                  type={"text"}
                  onChange={(event: any) =>
                    handleUpdate(event.target.value, item.id, "type")
                  }
                />

                <CRowCell
                  value={item.isComplete.toString()}
                  id={item.id}
                  type={"text"}
                  onChange={(event: any) =>
                    handleUpdate(event.target.value, item.id, "isComplete")
                  }
                />

                <CRowCell
                  value={item.nodes?.length}
                  id={item.id}
                  type={"text"}
                  onChange={(event: any) =>
                    handleUpdate(event.target.value, item.id, "node")
                  }
                />
              </Row>
            ))}
          </Body>
        </>
      )}
    </Table>
  );
}
