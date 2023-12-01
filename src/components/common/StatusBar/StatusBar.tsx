import tools from "@/src/core/utils/tools";
import ResizableYBox from "../../base/ResizableBox/ResizableYBox";
import { StatusBarStyled } from "./StatusBar.styled";
import StatusBarActions from "./StatusBarActions";
import StatusBarPagination from "./StatusBarPagination";
import StatusBarTabs from "./StatusBarTabs";

export default function StatusBar() {
  return (
    <ResizableYBox
      width={"100%"}
      position={"absolute"}
      height={41}
      direction="btt"
      right={0}
      left={0}
      bottom={100}
      mt={"100px"}
      minHeight={41}
      maxHeight={tools.screenMaxHeight()}
    >
      <StatusBarStyled>
        <StatusBarActions />
        <StatusBarTabs />
        <StatusBarPagination />
      </StatusBarStyled>
    </ResizableYBox>
  );
}
