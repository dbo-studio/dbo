import { shortcuts } from '@/core/utils';
import locales from '@/locales';
import { Box, Typography, useTheme } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';

export default function ShortcutPanel() {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant='h6'>{locales.shortcuts}</Typography>

      <Box mt={theme.spacing(2)}>
        {Object.entries(shortcuts).map(([key, value]) => (
          <Grid key={key} container spacing={2}>
            <Grid md={8}>
              <Typography variant='body2'>{value.label}</Typography>
            </Grid>
            <Grid md={4}>
              <Typography variant='body2'>{value.command}</Typography>
            </Grid>
          </Grid>
        ))}
      </Box>
    </Box>
  );
}
