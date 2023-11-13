import { useUUID } from "@/src/hooks";
import { Box, Button, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Icon from "../ui/icon";
import TabPanel from "./TabPanel";

let maxTabLength = 5;

type ItemType = {
  id: number;
  key: string;
  title: string;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function MyTabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
    >
      {value === index && <>{children}</>}
    </div>
  );
}

export default function EditorTab() {
  const [value, setValue] = useState(0);
  const [items, setItems] = useState<ItemType[]>([]);
  const keys = useUUID(maxTabLength);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const itemMaker = (id: number, key: string) => ({
    id: id,
    key: key,
    title: `new item ${key.substring(0, 8)}`,
  });

  const handleAddTab = () => {
    const index = maxTabLength - (maxTabLength - items.length);
    let key;

    let newItems: any[] = [];

    if (index < maxTabLength) {
      key = keys[index];
      newItems = [...items, itemMaker(index, key)];
    } else {
      key = uuidv4();
      newItems = [itemMaker(index, key), ...items.slice(1)];
    }

    setItems(newItems);
  };

  const handleRemoveTab = () => {
    // console.log("🚀 ~ file: index.tsx:77 ~ handleRemoveTab ~ tabId:", tabId);
    // const newTabs = tabs;
    // newTabs.splice(tabId, 1);
    // console.log(
    //   "🚀 ~ file: index.tsx:79 ~ handleRemoveTab ~ newTabs:",
    //   newTabs,
    // );
    // setTabs(newTabs);
    // setTabsContent(tabs.filter((tab, index) => index !== tabId));
    // console.log(tabs);
  };

  return (
    <Box>
      <Button onClick={handleAddTab}>Add Tab</Button>

      {items.length > 0 && (
        <Tabs value={value} onChange={handleChange} variant="scrollable">
          {items.map(({ id, key, title }: ItemType) => (
            <Tab
              sx={{ flex: 1 }}
              label={
                <div>
                  <Icon type="close" size="xs" onClick={handleRemoveTab} />
                  {title}
                </div>
              }
              key={key}
            />
          ))}
        </Tabs>
      )}

      <Box p={2}>
        {items.length > 0 &&
          items.map(
            ({ id, key }: ItemType) =>
              id === value && (
                <MyTabPanel key={key} value={value} index={id}>
                  <TabPanel />
                </MyTabPanel>
              ),
          )}
      </Box>
    </Box>
  );
}
