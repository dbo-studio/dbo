import { variables } from '@/core/theme/variables';
import { useAnalyticsSetting } from '@/hooks/useAnalyticsSetting';
import locales from '@/locales';
import { Box, Stack, Switch, Typography } from '@mui/material';
import { Check, X } from 'lucide-react';
import type { JSX } from 'react';

type Fact = { id: string; text: string };

const SENT: Fact[] = [
  { id: 'sent-features', text: locales.onboarding_privacy_sent_1 },
  { id: 'sent-version', text: locales.onboarding_privacy_sent_2 }
];

const NEVER: Fact[] = [
  { id: 'never-data', text: locales.onboarding_privacy_never_1 },
  { id: 'never-secrets', text: locales.onboarding_privacy_never_2 }
];

function FactList({ title, facts, sent }: { title: string; facts: Fact[]; sent: boolean }): JSX.Element {
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

/** The analytics choice, explained, with its switch. Same setting as Settings, General. */
export default function PrivacyStep(): JSX.Element {
  const [enabled, setEnabled] = useAnalyticsSetting();

  return (
    <Stack spacing={2} sx={{ width: '100%' }} data-testid='onboarding-privacy'>
      <Stack
        direction='row'
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          borderRadius: variables.radius.medium,
          border: 1,
          borderColor: enabled ? 'primary.main' : 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Box>
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {locales.onboarding_privacy_switch}
          </Typography>
          <Typography variant='body2' color='text.secondary' data-testid='onboarding-analytics-state'>
            {enabled ? locales.onboarding_privacy_on : locales.onboarding_privacy_off}
          </Typography>
        </Box>
        <Switch
          checked={enabled}
          onChange={(event): void => setEnabled(event.target.checked)}
          slotProps={{ input: { 'aria-label': locales.onboarding_privacy_switch } }}
          data-testid='onboarding-analytics'
        />
      </Stack>
      <FactList title={locales.onboarding_privacy_sent} facts={SENT} sent />
      <FactList title={locales.onboarding_privacy_never} facts={NEVER} sent={false} />
    </Stack>
  );
}
