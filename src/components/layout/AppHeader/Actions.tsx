import { IconButton, Stack } from "@mui/material";
import CustomIcon from "../../base/CustomIcon/CustomIcon";

export default function Actions() {
  return (
    <Stack spacing={2} direction="row" justifyContent="flex-end">
      <IconButton aria-label="sideLeft">
        <CustomIcon type={"sideLeft"} size={"s"} />
      </IconButton>
      <IconButton aria-label="sideBottom">
        <CustomIcon type={"sideBottom"} size={"s"} />
      </IconButton>
      <IconButton aria-label="sideRight">
        <CustomIcon type={"sideRight"} size={"s"} />
      </IconButton>
    </Stack>
  );
}