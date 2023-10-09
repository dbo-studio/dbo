import { ConnectionBox } from "@/components/connection-info/ConnectionBox";
import { IconButton, Stack } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import Icon from "../icon/Index";

export default function ConnectionInfo() {
  return (
    <Grid container>
      <Grid>
        <Stack justifyContent="flex-end">
          <IconButton aria-label="connection">
            <Icon type={"connection"} size={"s"} />
          </IconButton>
          <IconButton aria-label="lock">
            <Icon type={"lock"} size={"s"} />
          </IconButton>
          <IconButton aria-label="database">
            <Icon type={"database"} size={"s"} />
          </IconButton>
        </Stack>
      </Grid>
      <Grid md={2}>
        <ConnectionBox />
      </Grid>

      <Grid>
        <Stack justifyContent="flex-start">
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
    </Grid>
  );
}
