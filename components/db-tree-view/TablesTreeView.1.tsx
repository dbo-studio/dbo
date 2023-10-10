import { TreeItem } from "@mui/x-tree-view/TreeItem";
import { TreeView } from "@mui/x-tree-view/TreeView";
import Icon from "../icon/Index";

export default function TablesTreeView() {
  return (
    <TreeView
      aria-label="file system navigator"
      defaultCollapseIcon={<Icon type={"arrowDown"} />}
      defaultExpandIcon={<Icon type={"arrowRight"} />}
    >
      <TreeItem nodeId="1" label="Applications">
        <TreeItem nodeId="2" label="Calendar" />
      </TreeItem>
      <TreeItem nodeId="3" label="Functions">
        <TreeItem nodeId="4" label="OSS" />
      </TreeItem>
      <TreeItem nodeId="5" label="Views">
        <TreeItem nodeId="6" label="OSS" />
      </TreeItem>
      <TreeItem nodeId="7" label="MaterializeView">
        <TreeItem nodeId="8" label="OSS" />
      </TreeItem>
    </TreeView>
  );
}
