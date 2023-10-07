import React, { useState, Fragment, useMemo } from "react";
import {
  EuiIcon,
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiText,
  EuiNotificationBadge,
} from "@elastic/eui";
import DBTreeView from "@/components/db-tree-view";
import { css } from "@emotion/css";

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
    id: "dextrose--id",
    name: "Queries",
    content: (
      <Fragment>
        <EuiSpacer />
        <EuiText>
          <p>
            Intravenous sugar solution, also known as dextrose solution, is a
            mixture of dextrose (glucose) and water. It is used to treat low
            blood sugar or water loss without electrolyte loss.
          </p>
        </EuiText>
      </Fragment>
    ),
  },
  {
    id: "hydrogen--id",
    name: "History",
    content: (
      <Fragment>
        <EuiSpacer />
        <EuiText>
          <p>
            Hydrogen is a chemical element with symbol H and atomic number 1.
            With a standard atomic weight of 1.008, hydrogen is the lightest
            element on the periodic table
          </p>
        </EuiText>
      </Fragment>
    ),
  },
];

const EuiTabsStyle = css({
  display: "flex",
  justifyContent: "space-evenly",
});

const EuiTabStyle = css({
  borderRadius: 4,
  width: "100%",
  margin: "0 8px",
  height: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  span: {
    fontWeight: "400",
  },
});

const EuiTabStyleActive = css({
  background: "#E6F1FA",
  border: "1px solid #CCD7E1",
  borderRadius: 4,
  width: "100%",
  margin: "0 8px",
  height: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export default function StartContainer() {
  const [selectedTabId, setSelectedTabId] = useState("db-tree-view-id");
  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        css={tab.id === selectedTabId ? EuiTabStyleActive : EuiTabStyle}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <>
      <EuiTabs css={EuiTabsStyle}>{renderTabs()}</EuiTabs>
      {selectedTabContent}
    </>
  );
}
