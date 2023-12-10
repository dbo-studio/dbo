import { useState } from "react";
import { StatusBarStyled } from "./StatusBar.styled";
import StatusBarActions from "./StatusBarActions";
import StatusBarPagination from "./StatusBarPagination";
import StatusBarTabs from "./StatusBarTabs";

export default function StatusBar() {
  const [tabContent, setTabContent] = useState(null);

  const handleStatusBarTabChange = (content: any) => {
    setTabContent(content);
  };

  return (
    <StatusBarStyled>
      <StatusBarActions />
      <StatusBarTabs onTabChange={handleStatusBarTabChange} />
      <StatusBarPagination />
    </StatusBarStyled>
  );
}
