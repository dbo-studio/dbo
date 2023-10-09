import Icon from "@/components/icon/Index";
import { IconButton, Stack } from "@mui/material";

export default function Leading() {
  return (
    <Stack direction="row" justifyContent="flex-start">
      <IconButton aria-label="user">
        <Icon type={"user"} size={"s"} />
      </IconButton>

      <IconButton aria-label="settings">
        <Icon type={"settings"} size={"s"} />
      </IconButton>
    </Stack>
  );
}
