import { variables } from '@/core/theme/variables';
import locales from '@/locales';
import { Box, Typography, alpha } from '@mui/material';
import { Check, UserRound } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

const POINTS = [
  { id: 'point-1', text: locales.account_connect_point_1 },
  { id: 'point-2', text: locales.account_connect_point_2 },
  { id: 'point-3', text: locales.account_connect_point_3 }
];

/** What the account gives you: one card with the intro, the three points and, when given, the action. */
export default function AccountIntro({ action }: { action?: ReactNode }): JSX.Element {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        p: 2.5,
        borderRadius: variables.radius.large,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: variables.radius.medium,
            color: 'primary.main',
            bgcolor: (theme): string => alpha(theme.palette.primary.main, 0.12)
          }}
        >
          <UserRound size={20} />
        </Box>
        <Typography variant='body2' color='text.secondary'>
          {locales.account_connect_intro}
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {POINTS.map((point) => (
          <Box key={point.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
            <Box
              sx={{
                width: 18,
                height: 18,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                color: 'primary.main',
                bgcolor: (theme): string => alpha(theme.palette.primary.main, 0.12)
              }}
            >
              <Check size={12} />
            </Box>
            <Typography variant='body2'>{point.text}</Typography>
          </Box>
        ))}
      </Box>
      {action ? <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>{action}</Box> : null}
    </Box>
  );
}
