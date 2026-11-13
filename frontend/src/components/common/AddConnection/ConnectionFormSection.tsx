import { Box, Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';

/** A titled group of form fields; keeps long forms scannable. */
export default function ConnectionFormSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
      <Typography variant='overline' color='textSubdued' sx={{ lineHeight: 1.6 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
