import { Box } from "@mui/material";
import ActionBar from "../action-bar";
import DBDataGrid from "../db-data-grid";
import QueryPreview from "../query-preview";

interface TabPanelProps {}

export default function TabPanel({}) {
  return (
    <Box>
      <ActionBar />
      <QueryPreview />
      <DBDataGrid />
    </Box>
  );
}
