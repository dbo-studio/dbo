import { Box, Tab, Tabs, styled, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import React, { useMemo, useState } from "react";
import ResizableXBox from "../../base/ResizableBox/ResizableXBox";

const DynamicDBFields = dynamic(
  () => import("@/src/components/common/DBFelids/DBFelids"),
  {
    loading: () => null,
  },
);

const tabs = [
  {
    id: 0,
    name: "Fields",
    content: (
      <>
        <DynamicDBFields />
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
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    height: "100vh",
    overflow: "auto",
  });

  return (
    <ResizableXBox width={285} direction="ltr" maxWidth={500}>
      <StartContainerStyle>
        <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label="Fields" />
          <Tab label="DDL" />
          <Tab label="Info" />
        </Tabs>

        <Box role="tabpanel">{selectedTabContent}</Box>
      </StartContainerStyle>
    </ResizableXBox>
  );
}