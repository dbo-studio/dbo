import MaterialCheckbox from "@mui/material/Checkbox";
import {
  Body,
  Cell,
  Header,
  HeaderCell,
  HeaderRow,
  Row,
  Table,
  TableNode,
} from "@table-library/react-table-library";
import { getTheme } from "@table-library/react-table-library/baseline";
import {
  HeaderCellSort,
  useSort,
} from "@table-library/react-table-library/sort";
import { useTheme } from "@table-library/react-table-library/theme";
import { useState } from "react";
import { nodes } from "./data";

import { Button } from "@mui/material";
import {
  SelectTypes,
  useRowSelect,
} from "@table-library/react-table-library/select";
import Icon from "../ui/icon/Index";

export default function DBDataGrid() {
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

  const getIcon = (sortKey: string) => {
    if (sort.state.sortKey === sortKey && sort.state.reverse) {
      return <Icon type="arrowDown" />;
    }

    if (sort.state.sortKey === sortKey && !sort.state.reverse) {
      return <Icon type="arrowUp" />;
    }

    return null;
  };

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
              <HeaderCell resize={{ minWidth: 50, resizerWidth: 50 }}>
                <MaterialCheckbox
                  inputProps={{ "aria-label": "select all" }}
                  size="small"
                  checked={select.state.all}
                  indeterminate={!select.state.all && !select.state.none}
                  onChange={select.fns.onToggleAll}
                />
              </HeaderCell>
              <HeaderCell>
                <Button
                  fullWidth
                  style={{ justifyContent: "flex-start" }}
                  endIcon={getIcon("TASK")}
                  onClick={() =>
                    sort.fns.onToggleSort({
                      sortKey: "TASK",
                    })
                  }
                >
                  Task
                </Button>
              </HeaderCell>

              <HeaderCellSort resize sortKey="DEADLINE">
                Deadline
              </HeaderCellSort>
              <HeaderCellSort resize sortKey="TYPE">
                Type
              </HeaderCellSort>
              <HeaderCellSort resize sortKey="COMPLETE">
                Complete
              </HeaderCellSort>
              <HeaderCellSort resize sortKey="TASKS">
                Tasks
              </HeaderCellSort>
            </HeaderRow>
          </Header>

          <Body>
            {tableList.map((item: TableNode) => (
              <Row key={item.id} item={item}>
                <Cell stiff>
                  <MaterialCheckbox
                    inputProps={{ "aria-label": "select item" }}
                    size="small"
                    checked={select.state.ids.includes(item.id)}
                    onChange={() => select.fns.onToggleById(item.id)}
                  />
                </Cell>
                <Cell>
                  <input
                    type="text"
                    value={item.name}
                    style={{
                      width: "100%",
                      border: "none",
                      fontSize: "1rem",
                      padding: 0,
                      margin: 0,
                    }}
                    onChange={(event) =>
                      handleUpdate(event.target.value, item.id, "name")
                    }
                  />
                </Cell>
                <Cell>
                  <input
                    type="date"
                    style={{
                      width: "100%",
                      border: "none",
                      fontSize: "1rem",
                      padding: 0,
                      margin: 0,
                    }}
                    value={item.deadline.toISOString().substr(0, 10)}
                    onChange={(event) =>
                      handleUpdate(
                        new Date(event.target.value),
                        item.id,
                        "deadline",
                      )
                    }
                  />
                </Cell>
                <Cell>{item.type}</Cell>
                <Cell>{item.isComplete.toString()}</Cell>
                <Cell>{item.nodes?.length}</Cell>
              </Row>
            ))}
          </Body>
        </>
      )}
    </Table>
  );
}
