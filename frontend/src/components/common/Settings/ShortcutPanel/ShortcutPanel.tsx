import { shortcuts } from '@/core/utils';
import locales from '@/locales';
import { Box, Grid2, Typography, useTheme } from '@mui/material';

export default function ShortcutPanel() {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant='h6'>{locales.shortcuts}</Typography>

      <Box mt={theme.spacing(2)}>
        {Object.entries(shortcuts).map(([key, value]) => (
          <Grid2 key={key} container spacing={2}>
            <Grid2 size={{ md: 8 }}>
              <Typography variant='body2'>{value.label}</Typography>
            </Grid2>
            <Grid2 size={{ md: 4 }}>
              <Typography variant='body2'>{value.command}</Typography>
            </Grid2>
          </Grid2>
        ))}
      </Box>
    </Box>
  );
}
