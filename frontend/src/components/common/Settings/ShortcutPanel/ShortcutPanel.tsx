import { shortcuts } from '@/core/utils';
import locales from '@/locales';
import { Box, Divider, Grid2, Typography } from '@mui/material';

export default function ShortcutPanel() {
  return (
    <Box>
      <Typography color={'textTitle'} variant='h6'>
        {locales.shortcuts}
      </Typography>
      <Divider />
      <Box mt={2}>
        {Object.entries(shortcuts).map(([key, value]) => (
          <Grid2 mt={1} key={key} container spacing={2}>
            <Grid2 size={{ md: 8 }}>
              <Typography color={'textText'} variant='body2'>
                {value.label}
              </Typography>
            </Grid2>
            <Grid2 size={{ md: 4 }}>
              <Typography color={'textText'} variant='body2'>
                {value.command}
              </Typography>
            </Grid2>
          </Grid2>
        ))}
      </Box>
    </Box>
  );
}
