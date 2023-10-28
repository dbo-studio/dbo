import Icon from "@/components/ui/icon";
import { Box, Tab, Tabs } from "@mui/material";
import React, { useState } from "react";

interface EditorTabProps {
  children: React.ReactNode;
}

let maxTabIndex = 0;
let currentTabIndex = 0;

export default function EditorTab({ children }: EditorTabProps) {
  const [tabId, setTabId] = useState(0);
  const handleTabChange = (event: any, newTabId: any) => {
    if (newTabId === "tabProperties") {
      handleAddTab();
    } else {
      currentTabIndex = newTabId;
      setTabId(newTabId);
    }
  };

  const [tabs, setAddTab] = React.useState([]);
  const handleAddTab = () => {
    maxTabIndex = maxTabIndex + 1;
    setAddTab([
      ...tabs,
      <Tab label={`New Tab ${maxTabIndex}`} key={maxTabIndex} />,
    ]);
    handleTabsContent();
  };

  const [tabsContent, setTabsContent] = React.useState([
    <TabPanel key={1} tabId={tabId}>
      Default Panel - {Math.random()}
    </TabPanel>,
  ]);

  const handleTabsContent = () => {
    const contents = tabsContent;
    contents[tabId] = (
      <TabPanel key={tabId} tabId={tabId}>
        New Tab Panel - {Math.random()}
      </TabPanel>
    );

    console.log(contents);

    setTabsContent(contents);
  };

  return (
    <Box>
      <Tabs value={tabId} onChange={handleTabChange} variant="scrollable">
        <Tab label="Default" />
        {tabs.map((child) => child)}
        <Tab icon={<Icon type={"user"} />} value="tabProperties" />
      </Tabs>

      <Box padding={2}>{tabsContent[currentTabIndex]}</Box>
    </Box>
  );
}

function TabPanel(props: any) {
  const { children, tabId } = props;
  return (
    // <Box
    //   value={maxTabIndex}
    //   index={maxTabIndex}
    //   hidden={tabId !== currentTablIndex}
    //   key={maxTabIndex}
    // >
    //   {children}
    // </Box>

    <Box hidd>{children}</Box>
  );
}
