import { Box, Tab, Tabs } from "@mui/material";
import dynamic from "next/dynamic";
import { createElement, useState } from "react";
import CustomIcon from "../../base/CustomIcon/CustomIcon";

const maxTabs = 5;

const DynamicTabPanel = dynamic(() => import("./TabPanel"), {
  loading: () => null,
});

export default function EditorTab() {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [selectedTab, setSelectedTab] = useState<number>(0);

  const handleTabChange = (index: number, content: any) => {
    const newTabs = [...tabs];
    newTabs[index].content = content;
    setTabs(newTabs);
  };

  const handleAddTab = () => {
    if (tabs.length < maxTabs) {
      const newTabs = [...tabs, createNewTab(tabs.length + 1)];
      setTabs(newTabs);
      setSelectedTab(newTabs.length - 1);
    } else {
      const oldestTab = tabs[0];
      const newTabs = [...tabs.slice(1), createNewTab(tabs.length + 1)];
      setTabs(newTabs);
      setSelectedTab(tabs.length - 1);

      // Optionally, you can handle the content of the replaced tab here
      console.log("Replacing tab:", oldestTab);
    }
  };

  const handleRemoveTab = () => {
    if (tabs.length > 1) {
      const newTabs = [...tabs];
      newTabs.splice(selectedTab, 1);
      setTabs(newTabs);
      setSelectedTab(Math.min(selectedTab, newTabs.length - 1));
    }
  };

  const createNewTab = (index: number): TabData => {
    return {
      label: `Tab ${index}`,
      value: "",
      content: () => <DynamicTabPanel />,
      onChange: (content) => handleTabChange(index, content),
    };
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box>
      <Box>
        <Tabs value={selectedTab} onChange={handleChange} variant="scrollable">
          {tabs.map((tab, index) => (
            <Tab
              className="Mui-flat"
              sx={{ flex: 1 }}
              label={
                <div>
                  <CustomIcon
                    type="close"
                    size="xs"
                    onClick={handleRemoveTab}
                  />
                  {tab.label}
                </div>
              }
              key={index}
            />
          ))}
        </Tabs>
        {tabs.map((tab, index) => (
          <div key={index} hidden={selectedTab !== index}>
            {selectedTab === index && <div>{tab.content}</div>}
          </div>
        ))}
        <div>
          <button
            style={{ position: "absolute", right: 0, bottom: 0, zIndex: 9999 }}
            onClick={handleAddTab}
          >
            Add Tab
          </button>

          {tabs.map((tab, index) => (
            <div key={index} hidden={selectedTab !== index}>
              {selectedTab === index && (
                <div>
                  {createElement(tab.content, {
                    value: tab.value,
                    onChange: (content: string) => tab.onChange(content),
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </Box>
    </Box>
  );
}