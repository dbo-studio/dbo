import React, { useState, useMemo } from "react";
import {
  EuiIcon,
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiText,
  EuiNotificationBadge,
} from "@elastic/eui";

const tabs = [
  {
    id: "cobalt--id",
    name: "Cobalt",
    content: (
      <>
        <EuiSpacer />
        <EuiText>
          <p>
            Cobalt is a chemical element with symbol Co and atomic number 27.
            Like nickel, cobalt is found in the Earth&rsquo;s crust only in
            chemically combined form, save for small deposits found in alloys of
            natural meteoric iron. The free element, produced by reductive
            smelting, is a hard, lustrous, silver-gray metal.
          </p>
        </EuiText>
      </>
    ),
  },
  {
    id: "dextrose--id",
    name: "Dextrose",
    content: (
      <>
        <EuiSpacer />
        <EuiText>
          <p>
            Intravenous sugar solution, also known as dextrose solution, is a
            mixture of dextrose (glucose) and water. It is used to treat low
            blood sugar or water loss without electrolyte loss.
          </p>
        </EuiText>
      </>
    ),
  },
  {
    id: "hydrogen--id",
    name: "Hydrogen",
    content: (
      <>
        <EuiSpacer />
        <EuiText>
          <p>
            Hydrogen is a chemical element with symbol H and atomic number 1.
            With a standard atomic weight of 1.008, hydrogen is the lightest
            element on the periodic table
          </p>
        </EuiText>
      </>
    ),
  },
];

export default function EndContainer() {
  const [selectedTabId, setSelectedTabId] = useState("cobalt--id");
  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <>
      <EuiTabs>{renderTabs()}</EuiTabs>
      {selectedTabContent}
    </>
  );
}
