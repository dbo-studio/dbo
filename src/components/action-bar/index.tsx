import { IconButton, Stack, useTheme } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import Icon from "../ui/icon";

export default function ActionBar() {
  const theme = useTheme();

  return (
    <Stack
      borderBottom={`1px solid ${theme.palette.divider}`}
      padding={"8px 16px"}
      direction={"row"}
      justifyContent={"space-between"}
      alignItems={"center"}
    >
      <Grid md={8} display={"flex"} justifyContent={"flex-start"}>
        <IconButton color={"secondary"} aria-label="grid">
          <Icon type={"grid"} size={"s"} />
        </IconButton>
        <IconButton style={{ margin: "0 16px" }} aria-label="filter">
          <Icon type={"filter"} size={"s"} />
        </IconButton>
        <IconButton aria-label="sort">
          <Icon type={"sort"} size={"s"} />
        </IconButton>
      </Grid>
      <Grid md={8} mx={2} display={"flex"} justifyContent={"flex-end"}>
        <IconButton aria-label="code">
          <Icon type={"code"} size={"s"} />
        </IconButton>
        <IconButton style={{ margin: "0 16px" }} aria-label="export">
          <Icon type={"export"} size={"s"} />
        </IconButton>
        <IconButton aria-label="import">
          <Icon type={"import"} size={"s"} />
        </IconButton>
      </Grid>
    </Stack>
  );
}
