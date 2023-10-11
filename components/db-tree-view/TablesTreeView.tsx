import { Box } from "@mui/material";
import { TreeItem, TreeView } from "@mui/x-tree-view";
import Icon from "../icon/Index";

export default function TablesTreeView() {
  return (
    <Box mt={1}>
      <TreeView
        aria-label="file system navigator"
        defaultCollapseIcon={<Icon type={"arrowDown"} />}
        defaultExpandIcon={<Icon type={"arrowRight"} />}
        defaultEndIcon={<Icon type={"columnToken"} />}
      >
        <TreeItem nodeId="1" label="Applications">
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
