import { useSettingStore } from '@/src/store/settingStore/setting.store';
import Grid from '@mui/material/Unstable_Grid2';
import CenterContainer from './CenterContainer';
import EndContainer from './EndContainer';
import ExplorerContainer from './ExplorerContainer';
import StartContainer from './StartContainer';

export default function MainContainer() {
  const { sidebar } = useSettingStore();

  return (
    <Grid container spacing={0}>
      <Grid>
        <StartContainer />
      </Grid>
      {sidebar.showLeft && (
        <Grid>
          <ExplorerContainer />
        </Grid>
      )}
      <Grid flex={1}>
        <CenterContainer />
      </Grid>
      {sidebar.showRight && (
        <Grid>
          <EndContainer />
        </Grid>
      )}
    </Grid>
  );
}
