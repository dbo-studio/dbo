import React, { useState, Fragment, useMemo } from "react";
import { EuiTabs, EuiTab } from "@elastic/eui";
import DBTreeView from "@/components/db-tree-view";
import { css } from "@emotion/css";

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

const EuiTabActiveStyle = css({
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

type TabsProps = {
  id: string;
  name: string;
  content: any;
};

export default function Tabs({ tabs }: { tabs: TabsProps[] }) {
  const [selectedTabId, setSelectedTabId] = useState("db-tree-view-id");

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  return (
    <>
      <EuiTabs css={EuiTabsStyle}>
        {tabs.map((tab, index) => (
          <EuiTab
            key={index}
            onClick={() => onSelectedTabChanged(tab.id)}
            isSelected={tab.id === selectedTabId}
            css={tab.id === selectedTabId ? EuiTabActiveStyle : EuiTabStyle}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      {selectedTabContent}
    </>
  );
}
