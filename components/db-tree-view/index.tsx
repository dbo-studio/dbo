import { useEuiTheme } from "@elastic/eui";
import React from "react";
import Search from "./Search";
import TreeView from "./TreeView";
import styled from "@emotion/styled";

type Props = {};

export default function DBTreeView({}: Props) {
  const { euiTheme } = useEuiTheme();

  const DBTreeViewStyle = styled.div({
    padding: `${euiTheme.size.s}`,
  });

  return (
    <DBTreeViewStyle>
      <Search />
      <TreeView />
    </DBTreeViewStyle>
  );
}
