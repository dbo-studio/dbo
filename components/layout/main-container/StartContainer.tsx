import DBTreeView from "@/components/db-tree-view";
import styled from "@emotion/styled";
import { Box, Tab, Tabs } from "@mui/material";
import { useMemo, useState } from "react";

const tabs = [
  {
    id: 0,
    name: "Items",
    content: (
      <>
        <DBTreeView />
      </>
    ),
  },
  {
    id: 1,
    name: "Queries",
    content: (
      <>
        <p>Queries</p>
      </>
    ),
  },
  {
    id: 2,
    name: "History",
    content: (
      <>
        <p>History</p>
      </>
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
  const [selectedTabId, setSelectedTabId] = useState(0);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === Number(selectedTabId))?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          variant="fullWidth"
          value={selectedTabId}
          onChange={onSelectedTabChanged}
        >
          <Tab label="Item One" />
          <Tab label="Item Two" />
          <Tab label="Item Three" />
        </Tabs>
      </Box>
      <Box role="tabpanel">{selectedTabContent}</Box>
    </Box>
  );
}
