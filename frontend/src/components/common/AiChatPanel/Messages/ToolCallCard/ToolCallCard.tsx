import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AiToolTrace } from '@/types';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { AgentCardBodyStyled, AgentCardHeaderStyled, RawTextStyled, ToolRowStyled } from '../AgentCards.styled';
import ToolStatusPill from '../ToolStatusPill/ToolStatusPill';
import { describeToolStep, toolStepDetail } from '../../utils/toolStep';
import { contextScope } from '../../utils/contextScope';
import { useConnectionStore } from '@/store/connectionStore/connection.store';

const TOOL_ICONS: Record<string, keyof typeof IconTypes> = {
  list_tables: 'grid',
  list_views: 'grid',
  describe_table: 'structure',
  execute_sql: 'sql',
  propose_schema_change: 'network',
  execute_write: 'pen',
  preview_write: 'pen',
  update_plan: 'layoutList'
};

type SqlResult = {
  query: string;
  columns?: { name: string }[];
  rows: Record<string, unknown>[];
  count: number;
};

const parseArgs = (args: string | undefined): Record<string, unknown> => {
  try {
    return args ? (JSON.parse(args) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const parseSqlResult = (trace: AiToolTrace): SqlResult | undefined => {
  if (trace.name !== 'execute_sql' || !trace.result) return undefined;
  try {
    const parsed = JSON.parse(trace.result) as SqlResult;
    return Array.isArray(parsed.rows) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export default function ToolCallCard({
  trace,
  defaultExpanded = false
}: {
  trace: AiToolTrace;
  defaultExpanded?: boolean;
}): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const args = parseArgs(trace.args);
  const sqlArg = typeof args.sql === 'string' ? args.sql : undefined;
  const sqlResult = parseSqlResult(trace);
  const describedTable = trace.name === 'describe_table' && typeof args.table === 'string' ? args.table : undefined;

  const showTableInDiagram = (table: string): void => {
    const { database, schema } = contextScope(
      useAiStore.getState().context,
      useConnectionStore.getState().currentConnection()
    );
    useTabStore.getState().addDiagramTab({ database: database ?? '', schema: schema ?? '', focusTables: [table] });
  };

  return (
    <ToolRowStyled
      data-testid='ai-tool-card'
      data-tool={trace.name}
      data-status={trace.status}
      sx={{ containerType: 'inline-size' }}
    >
      <AgentCardHeaderStyled onClick={() => setExpanded((prev) => !prev)}>
        <CustomIcon type={TOOL_ICONS[trace.name] ?? 'code'} size='xs' />
        <Typography variant='caption' sx={{ fontWeight: 500, flexShrink: 0 }} data-testid='ai-tool-step'>
          {describeToolStep(trace)}
        </Typography>
        <Typography
          variant='caption'
          color='textSubdued'
          noWrap
          // In the narrow side panel the SQL would shrink to a letter; it stays one click away in the details.
          sx={{ flex: 1, minWidth: 0, '@container (max-width: 380px)': { visibility: 'hidden' } }}
          title={trace.name}
        >
          {toolStepDetail(trace)}
        </Typography>
        {trace.durationMs !== undefined && trace.status !== 'running' && (
          <Typography variant='caption' color='textSubdued' sx={{ flexShrink: 0 }}>
            {trace.durationMs} ms
          </Typography>
        )}
        <ToolStatusPill status={trace.status} />
        <CustomIcon type={expanded ? 'chevronDown' : 'chevronRight'} size='xs' />
      </AgentCardHeaderStyled>
      <Collapse in={expanded} unmountOnExit>
        <AgentCardBodyStyled>
          {sqlArg ? (
            <SyntaxHighlighter value={sqlArg} />
          ) : (
            // Arguments cut short in storage are no longer JSON; show them as they are.
            trace.args && (
              <RawTextStyled>{Object.keys(args).length > 0 ? JSON.stringify(args, null, 2) : trace.args}</RawTextStyled>
            )
          )}
          {trace.name === 'execute_sql' && (
            <Typography variant='caption' color='textSubdued'>
              {locales.ai_tool_sql_limits}
            </Typography>
          )}
          {trace.name === 'execute_sql' && sqlArg && (
            <Button
              variant='text'
              sx={{ alignSelf: 'flex-start' }}
              data-testid='ai-tool-link'
              onClick={() => useDataStore.getState().runQueryInEditor(sqlArg)}
            >
              {locales.ai_jump_to_data}
            </Button>
          )}
          {describedTable && (
            <Button
              variant='text'
              sx={{ alignSelf: 'flex-start' }}
              data-testid='ai-tool-link'
              onClick={() => showTableInDiagram(describedTable)}
            >
              {locales.ai_open_table_in_diagram}
            </Button>
          )}
          {trace.error && (
            <Typography variant='caption' color='error' sx={{ whiteSpace: 'pre-wrap' }}>
              {trace.error}
            </Typography>
          )}
          {/* Rows show once, below the steps (or on the canvas), so the step itself only says when there were none. */}
          {sqlResult
            ? sqlResult.rows.length === 0 && (
                <Typography variant='caption' color='textSubdued'>
                  {locales.ai_tool_no_rows}
                </Typography>
              )
            : trace.result && (
                <Box>
                  <RawTextStyled>{trace.result}</RawTextStyled>
                </Box>
              )}
        </AgentCardBodyStyled>
      </Collapse>
    </ToolRowStyled>
  );
}
