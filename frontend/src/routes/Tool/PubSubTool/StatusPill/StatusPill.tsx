import locales from '@/locales';
import { alpha, Box, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';

type StatusPillProps = { running: boolean; paused: boolean };

export default function StatusPill({ running, paused }: StatusPillProps): JSX.Element {
  const { palette } = useTheme();
  const color = !running ? palette.text.secondary : paused ? palette.warning.main : palette.success.main;
  const label = !running ? locales.nosql_pubsub_idle : paused ? locales.nosql_pubsub_paused : locales.nosql_pubsub_live;

  return (
    <Box
      data-testid='pubsub-status'
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        height: 32,
        borderRadius: 999,
        bgcolor: alpha(color, 0.12),
        color
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: color,
          '@keyframes pubsubPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
          animation: running && !paused ? 'pubsubPulse 1.4s ease-in-out infinite' : undefined
        }}
      />
      <Typography variant='caption' sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );
}
