import { Box, Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';

/** A titled step of the schedule form. The control sits below the title, using the full width. */
export default function FormSection({
  step,
  title,
  hint,
  children
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Box component='section' sx={{ py: 2, borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
        <Typography variant='caption' color='textSubdued' sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {step}
        </Typography>
        <Box>
          <Typography variant='subtitle2' color='textTitle'>
            {title}
          </Typography>
          {hint && (
            <Typography variant='caption' color='textSubdued' component='p'>
              {hint}
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 2.5 }}>{children}</Box>
    </Box>
  );
}
