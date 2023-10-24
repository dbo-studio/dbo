import DBFields from "@/src/components/db-felids";
import { Box, Tab, Tabs, styled, useTheme } from "@mui/material";
import React, { useMemo, useState } from "react";

const tabs = [
  {
    id: 0,
    name: "Fields",
    content: (
      <>
        <DBFields />
      </>
    ),
  },
  {
    id: 1,
    name: "DDL",
    content: (
      <>
        <p>DDL</p>
      </>
    ),
  },
  {
    id: 2,
    name: "Info",
    content: (
      <>
        <p>Info</p>
      </>
    ),
  },
];

export default function EndContainer() {
  const theme = useTheme();
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  const StartContainerStyle = styled(Box)({
    padding: "8px",
    border: `1px solid ${theme.palette.divider}`,
    height: "100vh",
    overflow: "auto",
  });

  return (
    <StartContainerStyle>
      <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
        <Tab label="Fields" />
        <Tab label="DDL" />
        <Tab label="Info" />
      </Tabs>

      <Box role="tabpanel">{selectedTabContent}</Box>
    </StartContainerStyle>
  );
}
