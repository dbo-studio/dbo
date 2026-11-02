import locales from '@/locales';
import { CircularProgress, Typography } from '@mui/material';
import type { JSX } from 'react';
import { useAiSession } from '../hooks/useAiSession';
import { PinnedPlanStyled } from './ChatBox.styled';

/** While the agent works, its current plan step stays in view above the composer. */
export default function PinnedPlan(): JSX.Element | null {
  const session = useAiSession();
  if (session.streaming.status !== 'streaming') return null;

  const plan = [...session.agentItems].reverse().find((item) => item.kind === 'plan');
  if (plan?.kind !== 'plan' || plan.steps.length === 0) return null;

  const done = plan.steps.filter((step) => step.status === 'done').length;
  const current = plan.steps.find((step) => step.status !== 'done') ?? plan.steps[plan.steps.length - 1];

  return (
    <PinnedPlanStyled data-testid='ai-plan-pinned'>
      <CircularProgress size={10} thickness={6} />
      <Typography variant='caption' color='textSubdued' sx={{ flexShrink: 0 }}>
        {locales.ai_plan_title.replace('{done}', String(done)).replace('{total}', String(plan.steps.length))}
      </Typography>
      <Typography variant='caption' noWrap sx={{ minWidth: 0 }}>
        {current.title}
      </Typography>
    </PinnedPlanStyled>
  );
}
