import { Box } from "@mui/material";
import ActionBar from "../ActionBar/ActionBar";
import DBDataGrid from "../DBDataGrid/DBDataGrid";
import QueryPreview from "../QueryPreview/QueryPreview";

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
