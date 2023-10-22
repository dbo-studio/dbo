import DBTreeView from "@/src/components/db-tree-view";
import styled from "@emotion/styled";
import { Box, Tab, Tabs, useTheme } from "@mui/material";
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

export default function StartContainer() {
  const theme = useTheme();
  const [selectedTabId, setSelectedTabId] = useState(0);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === Number(selectedTabId))?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  const StartContainerStyle = styled(Box)({
    padding: "8px",
    border: `1px solid ${theme.palette.divider}`,
    height: window.screen.height - 64,
    overflow: "auto",
  });

  return (
    <StartContainerStyle>
      <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
        <Tab label="Tables" />
        <Tab label="Queries" />
        <Tab label="History" />
      </Tabs>

      <Box role="tabpanel">{selectedTabContent}</Box>
    </StartContainerStyle>
  );
}
