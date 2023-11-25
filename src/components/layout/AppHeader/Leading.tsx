import { IconButton, Stack } from "@mui/material";
import CustomIcon from "../../base/CustomIcon/CustomIcon";

export default function Leading() {
  return (
    <Stack spacing={2} direction="row" justifyContent="flex-start">
      <IconButton aria-label="user">
        <CustomIcon type={"user"} size={"s"} />
      </IconButton>
      <IconButton aria-label="settings">
        <CustomIcon type={"settings"} size={"s"} />
      </IconButton>
    </Stack>
  );
}
