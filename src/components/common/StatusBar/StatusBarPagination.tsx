import { Box, IconButton, Typography } from "@mui/material";
import CustomIcon from "../../base/CustomIcon/CustomIcon";

export default function StatusBarPagination() {
  return (
    <Box
      alignItems={"center"}
      justifyContent={"flex-end"}
      display={"flex"}
      flexDirection={"row"}
      width={208}
    >
      <IconButton>
        <CustomIcon type="arrowLeft" />
      </IconButton>
      <Typography fontWeight={"bold"} textAlign={"center"} minWidth={54}>
        2
      </Typography>
      <IconButton>
        <CustomIcon type="arrowRight" />
      </IconButton>
    </Box>
  );
}
