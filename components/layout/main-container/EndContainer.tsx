import { Box, Tab, Tabs } from "@mui/material";
import React, { useMemo, useState } from "react";

const tabs = [
  {
    id: 0,
    name: "Cobalt",
    content: (
      <>
        <p>
          Cobalt is a chemical element with symbol Co and atomic number 27. Like
          nickel, cobalt is found in the Earth&rsquo;s crust only in chemically
          combined form, save for small deposits found in alloys of natural
          meteoric iron. The free element, produced by reductive smelting, is a
          hard, lustrous, silver-gray metal.
        </p>
      </>
    ),
  },
  {
    id: 1,
    name: "Dextrose",
    content: (
      <>
        <p>
          Intravenous sugar solution, also known as dextrose solution, is a
          mixture of dextrose (glucose) and water. It is used to treat low blood
          sugar or water loss without electrolyte loss.
        </p>
      </>
    ),
  },
  {
    id: 2,
    name: "Hydrogen",
    content: (
      <>
        <p>
          Hydrogen is a chemical element with symbol H and atomic number 1. With
          a standard atomic weight of 1.008, hydrogen is the lightest element on
          the periodic table
        </p>
      </>
    ),
  },
];

export default function EndContainer() {
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
        <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label="Item One" />
          <Tab label="Item Two" />
          <Tab label="Item Three" />
        </Tabs>
      </Box>
      <Box role="tabpanel">{selectedTabContent}</Box>
    </Box>
  );
}
