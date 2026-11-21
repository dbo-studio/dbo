import { Box, Stack, Typography } from '@mui/material';
import { Check, X } from 'lucide-react';
import type { JSX } from 'react';

export type OnboardingFact = { id: string; text: string };

type FactListProps = { title: string; facts: OnboardingFact[]; sent: boolean };

export default function FactList({ title, facts, sent }: FactListProps): JSX.Element {
  const Icon = sent ? Check : X;

  return (
    <Box>
      <Typography variant='overline' color='text.secondary'>
        {title}
      </Typography>
      <Stack spacing={1} sx={{ pt: 1 }}>
        {facts.map((fact) => (
          <Stack key={fact.id} direction='row' spacing={1.25} sx={{ alignItems: 'center' }}>
            <Icon size={16} />
            <Typography variant='body2'>{fact.text}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}