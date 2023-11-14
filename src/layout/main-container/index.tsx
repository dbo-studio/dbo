import Grid from "@mui/material/Unstable_Grid2";
import CenterContainer from "./CenterContainer";
import EndContainer from "./EndContainer";
import ExplorerContainer from "./ExplorerContainer";
import StartContainer from "./StartContainer";

export default function MainContainer() {
  return (
    <Grid container spacing={0}>
      <Grid md={1}>
        <StartContainer />
      </Grid>
      <Grid md={2.5}>
        <ExplorerContainer />
      </Grid>
      <Grid md={6}>
        <CenterContainer />
      </Grid>
      <Grid md={2.5}>
        <EndContainer />
      </Grid>
    </Grid>
  );
}
