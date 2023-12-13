import { Box } from "@mui/material";
import dynamic from "next/dynamic";
import ActionBar from "../ActionBar/ActionBar";

const DynamicQueryPreview = dynamic(
  () => import("../QueryPreview/QueryPreview"),
  {
    loading: () => null,
  },
);
const DynamicDBDataGrid = dynamic(() => import("../DBDataGrid/DBDataGrid"), {
  loading: () => null,
});
const DynamicStatusBar = dynamic(() => import("../StatusBar/StatusBar"), {
  loading: () => null,
});

export default function TabPanel({ tab }: any) {
  return (
    <Box>
      <ActionBar />
      <Box position={"relative"}>
        <DynamicQueryPreview />
        <DynamicDBDataGrid />
        <DynamicStatusBar />
      </Box>
    </Box>
  );
}
