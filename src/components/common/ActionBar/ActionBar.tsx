import { IconButton, Stack, useTheme } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import Icon from "../../base/icon/Icon";

export default function ActionBar() {
  const theme = useTheme();

  return (
    <Stack
      borderBottom={`1px solid ${theme.palette.divider}`}
      padding={"0 8px"}
      maxHeight={40}
      direction={"row"}
      justifyContent={"space-between"}
      alignItems={"center"}
    >
      <Grid md={8} display={"flex"} justifyContent={"flex-start"}>
        <IconButton color={"secondary"} aria-label="grid">
          <Icon type={"columnFillGreen"} size={"m"} />
        </IconButton>
        <IconButton aria-label="filter">
          <Icon type={"filterBrown"} size={"m"} />
        </IconButton>
        <IconButton aria-label="sort">
          <Icon type={"sortBlue"} size={"m"} />
        </IconButton>
      </Grid>
      <Grid md={8} mx={2} display={"flex"} justifyContent={"flex-end"}>
        <IconButton aria-label="code">
          <Icon type={"code"} size={"s"} />
        </IconButton>
        <IconButton aria-label="export">
          <Icon type={"export"} size={"s"} />
        </IconButton>
        <IconButton aria-label="import">
          <Icon type={"import"} size={"s"} />
        </IconButton>
      </Grid>
    </Stack>
  );
}
