import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { AiAgentItem } from '@/types';
import { CircularProgress, Collapse, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { AgentCardHeaderStyled, AgentCardStyled } from './AgentCards.styled';
import ToolCallCard from './ToolCallCard';

/** "Used N tools" accordion (Cursor pattern); open while the turn is live. */
export default function ToolCallGroup({ items, live = false }: { items: AiAgentItem[]; live?: boolean }): JSX.Element {
  const traces = items.flatMap((item) => (item.kind === 'tool' ? [item.trace] : []));
  const hasProblem = traces.some((trace) => trace.status === 'error' || trace.status === 'blocked');
  const running = traces.some((trace) => trace.status === 'running');
  const [expanded, setExpanded] = useState(live || hasProblem);

  return (
    <AgentCardStyled data-testid='ai-tool-group'>
      <AgentCardHeaderStyled onClick={() => setExpanded((prev) => !prev)}>
        {running ? <CircularProgress size={12} thickness={5} /> : <CustomIcon type='bot' size='xs' />}
        <Typography variant='caption' color='textSubdued' sx={{ fontWeight: 500, flex: 1 }}>
          {(traces.length === 1 ? locales.ai_used_tool : locales.ai_used_tools).replace('{n}', String(traces.length))}
        </Typography>
        <CustomIcon type={expanded ? 'chevronDown' : 'chevronRight'} size='xs' />
      </AgentCardHeaderStyled>
      <Collapse in={expanded}>
        {traces.map((trace) => (
          <ToolCallCard key={trace.id} trace={trace} />
        ))}
      </Collapse>
    </AgentCardStyled>
  );
}
