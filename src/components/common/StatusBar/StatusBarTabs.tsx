import { useUUID } from "@/src/hooks";
import { useTheme } from "@emotion/react";
import { Tab, Tabs } from "@mui/material";
import { useMemo, useState } from "react";
import CustomIcon from "../../base/CustomIcon/CustomIcon";
import { StatusBarTabTypes } from "./types";

const tabs: StatusBarTabTypes[] = [
  {
    id: 0,
    name: "Data",
    icon: "grid",
    iconActive: "gridBlue",
    content: "",
  },
  {
    id: 1,
    name: "Structure",
    icon: "structure",
    iconActive: "structureBlue",
    content: "",
  },
];

export default function StatusBarTabs() {
  const theme = useTheme();
  const [selectedTabId, setSelectedTabId] = useState(0);
  const uuids = useUUID(2);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === Number(selectedTabId))?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  return (
    <>
      <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
        {tabs.map((tabItem, index) => (
          <Tab
            iconPosition="start"
            icon={
              <CustomIcon
                type={
                  selectedTabId == tabItem.id
                    ? tabItem.iconActive
                    : tabItem.icon
                }
              />
            }
            label={tabItem.name}
            key={uuids[index]}
          />
        ))}
      </Tabs>

      {/* <Box role="tabpanel">{selectedTabContent}</Box> */}
    </>
  );
}
