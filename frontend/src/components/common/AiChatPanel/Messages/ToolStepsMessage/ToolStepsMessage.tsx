import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, Typography } from '@mui/material';

export default function ToolStepsMessage() {
  const toolSteps = useAiStore((s) => s.toolSteps);
  if (toolSteps.length === 0) return null;

  return (
    <Box sx={{ px: 1, py: 0.5 }}>
      {toolSteps.map((step) => (
        <Typography sx={{ display: 'block' }} key={step.id} variant='caption' color='textSubdued'>
          {step.status === 'running' && `Running ${step.name}…`}
          {step.status === 'done' && `✓ ${step.name}`}
          {step.status === 'error' && `✗ ${step.name}: ${step.error}`}
        </Typography>
      ))}
    </Box>
  );
}
