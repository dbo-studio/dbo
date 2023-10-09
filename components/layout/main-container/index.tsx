import Grid from "@mui/material/Unstable_Grid2";
import CenterContainer from "./CenterContainer";
import DBContainer from "./DBContainer";
import EndContainer from "./EndContainer";
import StartContainer from "./StartContainer";

export default function MainContainer() {
  return (
    <Grid container spacing={0}>
      <Grid md={1}>
        <DBContainer />
      </Grid>
      <Grid md={2}>
        <StartContainer />
      </Grid>
      <Grid md={6}>
        <CenterContainer />
      </Grid>
      <Grid md={2}>
        <EndContainer />
      </Grid>
    </Grid>
  );
}
