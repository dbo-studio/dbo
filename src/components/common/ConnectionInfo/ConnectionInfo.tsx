import ConnectionBox from "@/src/components/common/ConnectionInfo/ConnectionBox";
import { IconButton, Stack } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import Icon from "../../base/icon/Icon";

export default function ConnectionInfo() {
  return (
    <Stack direction={"row"} justifyContent={"center"} alignItems={"center"}>
      <Grid md={4}>
        <Stack direction={"row"} spacing={2} justifyContent="flex-end">
          <IconButton aria-label="connection">
            <Icon type={"connection"} size={"s"} />
          </IconButton>
          <IconButton aria-label="lock">
            <Icon type={"lock"} size={"s"} />
          </IconButton>
          <IconButton aria-label="database">
            <Icon type={"databaseOutline"} size={"s"} />
          </IconButton>
        </Stack>
      </Grid>
      <Grid md={8} mx={2}>
        <ConnectionBox />
      </Grid>

      <Grid md={4}>
        <Stack direction={"row"} spacing={2} justifyContent="flex-start">
          <IconButton aria-label="refresh">
            <Icon type={"refresh"} size={"s"} />
          </IconButton>
          <IconButton aria-label="search">
            <Icon type={"search"} size={"s"} />
          </IconButton>
          <IconButton aria-label="sql">
            <Icon type={"sql"} size={"s"} />
          </IconButton>
        </Stack>
      </Grid>
    </Stack>
  );
}
