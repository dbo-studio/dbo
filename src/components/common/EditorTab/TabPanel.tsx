import { Box } from "@mui/material";
import ActionBar from "../ActionBar/ActionBar";
import DBDataGrid from "../DBDataGrid/DBDataGrid";
import QueryPreview from "../QueryPreview/QueryPreview";
import StatusBar from "../StatusBar/StatusBar";

export default function TabPanel({}) {
  return (
    <Box>
      <ActionBar />
      <Box position={"relative"}>
        <QueryPreview />
        <DBDataGrid />
        <StatusBar />
      </Box>
    </Box>
  );
}
