import { Box, Button, Tab, Tabs } from "@mui/material";
import { ReactNode, useState } from "react";
import TabPanel from "./TabPanel";

let maxTabIndex = 5;

export default function EditorTab() {
  const [tabId, setTabId] = useState<number>(-1);
  const [tabs, setTabs] = useState<ReactNode[]>([]);
  const [currentContent, setCurrentContent] = useState<ReactNode | null>(null);
  const [tabsContent, setTabsContent] = useState<ReactNode[]>([]);

  const handleTabChange = (event: any, newTabId: number) => {
    setTabId(newTabId);
    setCurrentContent(tabsContent[newTabId]);
  };

  const handleAddTab = () => {
    const newTabId = tabs.length >= maxTabIndex ? 0 : tabs.length + 1;
    console.log("🚀 ~ file: index.tsx:21 ~ handleAddTab ~ newTabId:", newTabId);
    setTabId(newTabId);
    if (newTabId == 0) {
      setTabs([
        <Tab
          sx={{ flex: 1 }}
          label={`New Tab ${newTabId}`}
          key={newTabId}
          value={newTabId}
        />,
        ...tabs.slice(1),
      ]);
    } else {
      setTabs([
        ...tabs,
        <Tab
          sx={{ flex: 1 }}
          label={`New Tab ${newTabId}`}
          key={newTabId}
          value={newTabId}
        />,
      ]);
    }

    addContent();
  };

  const addContent = () => {
    const newContent = <TabPanel key={tabId + Math.random()} />;

    if (tabId == 0) {
      setTabsContent([newContent, ...tabsContent.slice(1)]);
    } else {
      setTabsContent([...tabsContent, newContent]);
    }
    setCurrentContent(newContent);
  };

  return (
    <Box>
      <Button onClick={handleAddTab}>Add Tab</Button>

      {tabs.length > 0 && (
        <Tabs value={tabId} onChange={handleTabChange} variant="scrollable">
          {tabs.map((child: ReactNode) => child)}
        </Tabs>
      )}

      <Box padding={2}>{currentContent}</Box>
    </Box>
  );
}
