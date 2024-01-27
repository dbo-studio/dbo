import Grid from '@mui/material/Unstable_Grid2';
import AddConnection from '../../common/AddConnection/AddConnection';
import CenterContainer from './CenterContainer';
import EndContainer from './EndContainer';
import ExplorerContainer from './ExplorerContainer';
import StartContainer from './StartContainer';

export default function MainContainer() {
  return (
    <Grid container spacing={0}>
      <Grid>
        <StartContainer />
      </Grid>
      <Grid>
        <ExplorerContainer />
      </Grid>
      <Grid flex={1}>
        <CenterContainer />
        <AddConnection />
      </Grid>
      <Grid>
        <EndContainer />
      </Grid>
    </Grid>
  );
}
