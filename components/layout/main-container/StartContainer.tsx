import React, { useState, Fragment, useMemo } from "react";
import { EuiSpacer, EuiText } from "@elastic/eui";
import DBTreeView from "@/components/db-tree-view";
import { css } from "@emotion/css";
import Tabs from "@/components/ui/tabs/Tabs";
import styled from "@emotion/styled";

const tabs = [
  {
    id: "db-tree-view-id",
    name: "Items",
    content: (
      <Fragment>
        <DBTreeView />
      </Fragment>
    ),
  },
  {
    id: "queries--id",
    name: "Queries",
    content: (
      <Fragment>
        <EuiSpacer />
        <EuiText>
          <p>Queries</p>
        </EuiText>
      </Fragment>
    ),
  },
  {
    id: "history--id",
    name: "History",
    content: (
      <Fragment>
        <EuiSpacer />
        <EuiText>
          <p>History</p>
        </EuiText>
      </Fragment>
    ),
  },
];

const StartContainerStyle = styled.div({
  padding: "8px 0",
  border: "1px solid #CCD7E1",
  height: "100vh",
  overflow: "auto",
  paddingBottom: "80px",
});

export default function StartContainer() {
  return (
    <StartContainerStyle className="eui-scrollBar">
      <Tabs tabs={tabs} />
    </StartContainerStyle>
  );
}
