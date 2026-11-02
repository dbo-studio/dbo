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
import ArtifactChip, { useInWorkstation } from '../ArtifactChip/ArtifactChip';
import ChatDataTable from '../ChatDataTable/ChatDataTable';
import { resultFromTrace } from '../../utils/queryResult';
import { useWorkspaceCanvas } from '@/components/common/AgentWorkspace/workspaceCanvas.store';
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
  // Results, charts and schema reviews are the answer, not a step, so they show whatever the density. In the
  // workstation the canvas shows results and charts in full and the chat links to them.
  const inWorkstation = useInWorkstation();
  const canvas = useWorkspaceCanvas.getState;
  const reports = traces.flatMap((trace) => {
    const result = resultFromTrace(trace);
    if (result && result.rows.length > 0) {
      const rowCount = locales.ai_table_rows.replace('{n}', String(result.rows.length));
      return inWorkstation
        ? [
            <ArtifactChip
              key={trace.id}
              icon='grid'
              label={result.title}
              detail={rowCount}
              testId='ai-chip-result'
              onOpen={() => canvas().open({ id: `result-${result.id}`, kind: 'result', result })}
            />
          ]
        : [<ChatDataTable key={trace.id} rows={result.rows} columns={result.columns} query={result.sql} />];
    }
    const report = reportFromTrace(trace);
    if (report) {
      return inWorkstation
        ? [
            <ArtifactChip
              key={trace.id}
              icon='layout'
              label={report.title}
              detail={locales.ai_canvas_tab_report}
              testId='ai-chip-report'
              onOpen={() => canvas().showReport(report)}
            />
          ]
        : [<ReportCard key={trace.id} report={report} />];
    }
    const review = reviewFromTrace(trace);
    return review ? [<SchemaReviewCard key={trace.id} review={review} />] : [];
  });

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
