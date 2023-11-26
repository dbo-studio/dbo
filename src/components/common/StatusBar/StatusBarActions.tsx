import { Box, IconButton, Stack } from "@mui/material";
import CustomIcon from "../../base/CustomIcon/CustomIcon";

export default function StatusBarActions() {
  return (
    <Stack direction={"row"} justifyContent={"space-between"} width={208}>
      <Box>
        <IconButton>
          <CustomIcon type="plus" width={14} />
        </IconButton>

        <IconButton>
          <CustomIcon type="mines" width={14} />
        </IconButton>
      </Box>
      <Box ml={1} mr={1}>
        <IconButton>
          <CustomIcon type="check" width={14} />
        </IconButton>

        <IconButton>
          <CustomIcon type="close" width={14} />
        </IconButton>
      </Box>
      <Box>
        <IconButton>
          <CustomIcon type="refresh" width={14} />
        </IconButton>

        <IconButton>
          <CustomIcon type="stop" width={14} />
        </IconButton>
      </Box>
    </Stack>
  );
}
