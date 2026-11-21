import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';

export default function Stat({ label, value, tone }: { label: string; value: string; tone?: string }): JSX.Element {
  return (
    <Box>
      <Typography variant='caption' color='textSubdued' component='p'>
        {label}
      </Typography>
      <Typography variant='body2' sx={{ color: tone }}>
        {value}
      </Typography>
    </Box>
  );
}
