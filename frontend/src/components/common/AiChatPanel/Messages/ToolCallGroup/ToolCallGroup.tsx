import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { AiAgentItem } from '@/types';
import { CircularProgress, Collapse, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { AgentCardHeaderStyled, AgentCardStyled } from '../AgentCards.styled';
import ToolCallCard from '../ToolCallCard/ToolCallCard';
import { describeToolStep } from '../../utils/toolStep';
import { reportFromTrace } from '../../utils/chartReport';
import ReportCard from '../ReportCard/ReportCard';
import { reviewFromTrace } from '../../utils/schemaReview';
import SchemaReviewCard from '../SchemaReviewCard/SchemaReviewCard';

/**
 * The agent's tool calls as a timeline of readable steps, like Cursor. Density
 * (Settings → AI) picks how much shows: compact folds the steps behind the latest
 * one, balanced lists every step, detailed also opens each step's details.
 */
export default function ToolCallGroup({ items, live = false }: { items: AiAgentItem[]; live?: boolean }): JSX.Element {
  const density = useSettingStore((state) => state.editor.aiToolDensity ?? 'balanced');
  const traces = items.flatMap((item) => (item.kind === 'tool' ? [item.trace] : []));
  const hasProblem = traces.some((trace) => trace.status === 'error' || trace.status === 'blocked');
  const running = traces.some((trace) => trace.status === 'running');
  const [expanded, setExpanded] = useState(hasProblem);
  const latest = traces[traces.length - 1];

  const steps = traces.map((trace) => (
    <ToolCallCard key={trace.id} trace={trace} defaultExpanded={density === 'detailed'} />
  ));
  // Charts and schema reviews are the answer, not a step, so they show whatever the density.
  const reports = traces
    .map(reportFromTrace)
    .filter((report) => report !== undefined)
    .map((report) => <ReportCard key={report.id} report={report} />)
    .concat(
      traces
        .map(reviewFromTrace)
        .filter((review) => review !== undefined)
        .map((review) => <SchemaReviewCard key={review.id} review={review} />)
    );

  if (density !== 'compact') {
    return (
      <>
        <AgentCardStyled data-testid='ai-tool-group' data-density={density}>
          {steps}
        </AgentCardStyled>
        {reports}
      </>
    );
  }

  return (
    <>
      <AgentCardStyled data-testid='ai-tool-group' data-density={density}>
        <AgentCardHeaderStyled onClick={() => setExpanded((prev) => !prev)}>
          {running ? <CircularProgress size={12} thickness={5} /> : <CustomIcon type='bot' size='xs' />}
          <Typography variant='caption' sx={{ fontWeight: 500, flex: 1, minWidth: 0 }} noWrap>
            {latest ? describeToolStep(latest) : ''}
          </Typography>
          {traces.length > 1 && (
            <Typography variant='caption' color='textSubdued' sx={{ flexShrink: 0 }}>
              {locales.ai_steps.replace('{n}', String(traces.length))}
            </Typography>
          )}
          <CustomIcon type={expanded ? 'chevronDown' : 'chevronRight'} size='xs' />
        </AgentCardHeaderStyled>
        <Collapse in={expanded || (live && running && traces.length === 1)}>{steps}</Collapse>
      </AgentCardStyled>
      {reports}
    </>
  );
}
