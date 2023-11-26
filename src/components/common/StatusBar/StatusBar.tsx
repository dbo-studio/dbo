import { StatusBarStyled } from "./StatusBar.styled";
import StatusBarActions from "./StatusBarActions";
import StatusBarPagination from "./StatusBarPagination";
import StatusBarTabs from "./StatusBarTabs";

export default function StatusBar() {
  return (
    <StatusBarStyled>
      <StatusBarActions />
      <StatusBarTabs />
      <StatusBarPagination />
    </StatusBarStyled>
  );
}
