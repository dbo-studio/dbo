import Icon from "@/components/icon/Index";
import { IconButton, Stack } from "@mui/material";

export default function Actions() {
  return (
    <Stack direction="row" justifyContent="flex-end">
      <IconButton aria-label="sideLeft">
        <Icon type={"sideLeft"} size={"s"} />
      </IconButton>
      <IconButton aria-label="sideBottom">
        <Icon type={"sideBottom"} size={"s"} />
      </IconButton>
      <IconButton aria-label="sideRight">
        <Icon type={"sideRight"} size={"s"} />
      </IconButton>
    </Stack>
  );
}
