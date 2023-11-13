import { useState } from "react";
import DynamicTabs, { TabData } from "./Tabs";

const maxTabs = 5;

export default function EditorTab() {
  const [tabs, setTabs] = useState<TabData[]>([
    {
      label: "Tab 1",
      value: "",
      content: ({ value, onChange }) => (
        <div>
          <textarea value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      ),
      onChange: (content) => handleTabChange(0, content),
    },
  ]);

  const [selectedTab, setSelectedTab] = useState<number>(0);

  const handleTabChange = (index: number, content: string) => {
    const newTabs = [...tabs];
    newTabs[index].value = content;
    setTabs(newTabs);
  };

  const handleAddTab = () => {
    if (tabs.length < maxTabs) {
      const newTabs = [...tabs, createNewTab(tabs.length + 1)];
      setTabs(newTabs);
      setSelectedTab(newTabs.length - 1);
    } else {
      // Replace the oldest tab
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
      content: ({ value, onChange }) => (
        <div>
          <textarea value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      ),
      onChange: (content) => handleTabChange(index, content),
    };
  };

  return (
    <div>
      <h1>Your Main Component</h1>
      <DynamicTabs
        tabs={tabs}
        value={selectedTab}
        onTabChange={setSelectedTab}
        onAddTab={handleAddTab}
        onRemoveTab={handleRemoveTab}
      />
    </div>
  );
}
