import ConnectionInfo from "@/components/connection-info";
import Grid from "@mui/material/Unstable_Grid2";
import Actions from "./Actions";
import Leading from "./Leading";

export default function AppHeader() {
  return (
    <Grid container spacing={0}>
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
