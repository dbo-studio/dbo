import locales from '@/locales';
import { Box, Typography, alpha } from '@mui/material';
import { Check, UserRound } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

const POINTS = [
  { id: 'point-1', text: locales.account_connect_point_1 },
  { id: 'point-2', text: locales.account_connect_point_2 },
  { id: 'point-3', text: locales.account_connect_point_3 }
];

/** What the account gives you; `action` sits between the intro and the points (omit it inside a modal). */
export default function AccountIntro({ action }: { action?: ReactNode }): JSX.Element {
  return (
    <>
      <Box
        sx={{
          width: 56,
          height: 56,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 3,
          color: 'primary.main',
          bgcolor: (theme): string => alpha(theme.palette.primary.main, 0.12)
        }}
      >
        <UserRound size={28} />
      </Box>
      <Typography variant='body1' color='text.secondary'>
        {locales.account_connect_intro}
      </Typography>
      {action}
      <Box sx={{ display: 'grid', gap: 1.25 }}>
        {POINTS.map((point) => (
          <Box key={point.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'center', color: 'text.secondary' }}>
            <Check size={16} />
            <Typography variant='body2'>{point.text}</Typography>
          </Box>
        ))}
      </Box>
    </>
  );
}
