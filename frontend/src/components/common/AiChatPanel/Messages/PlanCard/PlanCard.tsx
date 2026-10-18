import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { AiPlanStep } from '@/types';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import type { JSX } from 'react';
import { AgentCardBodyStyled, AgentCardStyled } from '../AgentCards.styled';

const StepIcon = ({ status }: { status: AiPlanStep['status'] }): JSX.Element => {
  if (status === 'done') return <CustomIcon type='check' size='xs' />;
  if (status === 'in_progress') return <CircularProgress size={12} />;
  return <Box sx={{ width: 12, height: 12, border: 1, borderColor: 'divider', borderRadius: '50%' }} />;
};

/** The agent's checklist; each update from the agent replaces the previous one. */
export default function PlanCard({ steps }: { steps: AiPlanStep[] }): JSX.Element {
  const done = steps.filter((step) => step.status === 'done').length;

  return (
    <AgentCardStyled data-testid='ai-plan-card'>
      <Typography variant='caption' sx={{ fontWeight: 600, px: 1, py: 0.75 }}>
        {locales.ai_plan_title.replace('{done}', String(done)).replace('{total}', String(steps.length))}
      </Typography>
      <AgentCardBodyStyled>
        {steps.map((step) => (
          <Stack
            key={step.title}
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center', opacity: step.status === 'done' ? 0.6 : 1 }}
            data-testid='ai-plan-step'
            data-status={step.status}
          >
            <StepIcon status={step.status} />
            <Typography variant='caption'>{step.title}</Typography>
          </Stack>
        ))}
      </AgentCardBodyStyled>
    </AgentCardStyled>
  );
}
