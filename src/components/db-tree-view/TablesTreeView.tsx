import { Box } from "@mui/material";
import { TreeItem, TreeView } from "@mui/x-tree-view";
import Icon from "../ui/icon/Index";

export default function TablesTreeView() {
  return (
    <Box mt={1}>
      <TreeView
        aria-label="file system navigator"
        defaultCollapseIcon={<Icon size="xs" type={"arrowDown"} />}
        defaultExpandIcon={<Icon size="xs" type={"arrowRight"} />}
        defaultEndIcon={<Icon size="xs" type={"columnToken"} />}
      >
        <TreeItem nodeId="1" label="Tables">
          <TreeItem nodeId="231" label="orders" />
          <TreeItem nodeId="232" label="users" />
          <TreeItem nodeId="233" label="products" />
          <TreeItem nodeId="234" label="order_products" />
          <TreeItem nodeId="235" label="transactions" />
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
    </Box>
  );
}