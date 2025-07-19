import { shortcuts } from '@/core/utils';
import locales from '@/locales';
import { Box, Divider, Grid, Typography } from '@mui/material';
import type { JSX } from 'react';

export default function ShortcutPanel(): JSX.Element {
  return (
    <Box>
      <Typography color={'textTitle'} variant='h6'>
        {locales.shortcuts}
      </Typography>
      <Divider />
      <Box mt={2}>
        {Object.entries(shortcuts).map(([key, value]) => (
          <Grid mt={1} key={key} container spacing={2}>
            <Grid size={{ md: 8 }}>
              <Typography color={'textText'} variant='body2'>
                {value.label}
              </Typography>
            </Grid>
            <Grid size={{ md: 4 }}>
              <Typography color={'textText'} variant='body2'>
                {value.command}
              </Typography>
            </Grid>
          </Grid>
        ))}
      </Box>
    </Box>
  );
}
