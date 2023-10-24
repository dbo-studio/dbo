import ConnectionInfo from "@/src/components/connection-info";
import Grid from "@mui/material/Unstable_Grid2";
import Actions from "./Actions";
import Leading from "./Leading";

export default function AppHeader() {
  return (
    <Grid
      className={"app-header"}
      p={2}
      container
      spacing={0}
      justifyContent={"space-between"}
    >
      <Grid md={2}>
        <Leading />
      </Grid>
      <Grid md={8}>
        <ConnectionInfo />
      </Grid>
      <Grid md={2}>
        <Actions />
      </Grid>
    </Grid>
  );
}
