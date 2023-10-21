import {
  Body,
  Data,
  Header,
  HeaderCell,
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

import { ButtonBase } from "@mui/material";
import {
  SelectTypes,
  useRowSelect,
} from "@table-library/react-table-library/select";
import { Action, State } from "@table-library/react-table-library/types/common";
import Icon from "../ui/icon/Index";
import CRowCell from "./CRowCell";

export default function CDataGrid() {
  const [data, setData] = useState<Data<TableNode>>({ nodes });

  const theme = useTheme([
    getTheme(),
    {
      HeaderCell: `
        text-align: left;
        height:30px;
        padding-right: 6px;
      `,
      BaseCell: `
        &:not(:last-of-type) {
          border-right: 1px solid #D3DAE6;
        }
        
        & .row-select-single-selected td{
           background-color: red;
        }
      `,
      HeaderRow: `
        height:30px;
        .th {
          border-bottom: 1px solid #D3DAE6;
        }
        background-color: #f9fafb;
        
       & .row-select-single-selected td{
           background-color: red;
        }
      `,
      Row: `
        .td {
          border-bottom: 1px solid #D3DAE6;
        }

        &:nth-of-type(odd) {
          background-color: #fff;
        }

        &:nth-of-type(even) {
          background-color: #FAFBFD;
        }

        .row-select-single-selected {
           background-color: red;
        }
      `,
    },
  ]);

  const sort = useSort(
    data,
    {
      onChange: (action: Action, state: State, context: any) => {
        console.log(action, state, context);
      },
    },
    {
      isServer: true,
      sortFns: {},
    },
  );

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

  const getIcon = (sortKey: string) => {
    if (sort.state.sortKey === sortKey && sort.state.reverse) {
      return <Icon type="arrowDown" size="xs" />;
    }

    if (sort.state.sortKey === sortKey && !sort.state.reverse) {
      return <Icon type="arrowUp" size="xs" />;
    }

    return null;
  };

  return (
    <Table
      data={data}
      select={select}
      sort={sort}
      theme={theme}
      layout={{ horizontalScroll: true }}
    >
      {(tableList: TableNode[]) => (
        <>
          <Header>
            <HeaderRow>
              {nodes.length > 0 &&
                Object.keys(nodes[0].fields).map((item, index) => {
                  return (
                    <HeaderCell key={index} resize={{ minWidth: 50 }}>
                      <ButtonBase
                        color="secondary"
                        style={{ justifyContent: "center" }}
                        onClick={() => {
                          sort.fns.onToggleSort({
                            sortKey: item,
                          });
                        }}
                      >
                        {item}
                        {getIcon(item)}
                      </ButtonBase>
                    </HeaderCell>
                  );
                })}
            </HeaderRow>
          </Header>

          <Body>
            {tableList.map((item: TableNode) => (
              <Row key={item.id} item={item}>
                {nodes.length > 0 &&
                  Object.keys(nodes[0].fields).map((field, index) => {
                    return (
                      <CRowCell
                        key={index}
                        select={select}
                        value={item.fields[field].value}
                        id={item.id}
                        type={item.fields[field].type}
                        onChange={(event: any) => {
                          handleUpdate(event.target.value, item.id, "name");
                          // handleUpdate(
                          //     new Date(event.target.value),
                          //     item.id,
                          //     "deadline",
                          //   )
                        }}
                      />
                    );
                  })}
              </Row>
            ))}
          </Body>
        </>
      )}
    </Table>
  );
}
