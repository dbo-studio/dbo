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
import ChatDataTable from '../ChatDataTable/ChatDataTable';
import { AgentCardBodyStyled, AgentCardHeaderStyled, RawTextStyled, ToolRowStyled } from '../AgentCards.styled';
import ToolStatusPill from '../ToolStatusPill/ToolStatusPill';

const TOOL_ICONS: Record<string, keyof typeof IconTypes> = {
  list_tables: 'grid',
  list_views: 'grid',
  describe_table: 'structure',
  execute_sql: 'sql',
  propose_schema_change: 'network',
  execute_write: 'pen'
};

type SqlResult = { query: string; rows: Record<string, unknown>[]; count: number };

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

/** Short, single-line argument summary shown next to the tool name. */
const summarizeArgs = (args: Record<string, unknown>): string => {
  if (typeof args.sql === 'string') return args.sql.replace(/\s+/g, ' ');
  if (typeof args.table === 'string') return args.table;
  if (Array.isArray(args.ops)) return locales.ai_tool_ops_count.replace('{n}', String(args.ops.length));
  if (typeof args.schema === 'string') return args.schema;
  return '';
};

export default function ToolCallCard({ trace }: { trace: AiToolTrace }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const args = parseArgs(trace.args);
  const sqlArg = typeof args.sql === 'string' ? args.sql : undefined;
  const sqlResult = parseSqlResult(trace);
  const describedTable = trace.name === 'describe_table' && typeof args.table === 'string' ? args.table : undefined;

  const showTableInDiagram = (table: string): void => {
    const context = useAiStore.getState().context;
    useTabStore
      .getState()
      .addDiagramTab({ database: context.database ?? '', schema: context.schema ?? '', focusTable: table });
  };

  return (
    <ToolRowStyled data-testid='ai-tool-card' data-tool={trace.name} data-status={trace.status}>
      <AgentCardHeaderStyled onClick={() => setExpanded((prev) => !prev)}>
        <CustomIcon type={TOOL_ICONS[trace.name] ?? 'code'} size='xs' />
        <Typography variant='caption' sx={{ fontWeight: 600, flexShrink: 0 }}>
          {trace.name}
        </Typography>
        <Typography variant='caption' color='textSubdued' noWrap sx={{ flex: 1, minWidth: 0 }}>
          {summarizeArgs(args)}
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
            trace.args && <RawTextStyled>{JSON.stringify(args, null, 2)}</RawTextStyled>
          )}
          {trace.name === 'execute_sql' && (
            <Typography variant='caption' color='textSubdued'>
              {locales.ai_tool_sql_limits}
            </Typography>
          )}
          {trace.name === 'execute_sql' && sqlArg && (
            <Button
              size='small'
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
              size='small'
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
          {sqlResult ? (
            sqlResult.rows.length > 0 ? (
              <ChatDataTable rows={sqlResult.rows} query={sqlArg ?? sqlResult.query} />
            ) : (
              <Typography variant='caption' color='textSubdued'>
                {locales.ai_tool_no_rows}
              </Typography>
            )
          ) : (
            trace.result && (
              <Box>
                <RawTextStyled>{trace.result}</RawTextStyled>
              </Box>
            )
          )}
        </AgentCardBodyStyled>
      </Collapse>
    </ToolRowStyled>
  );
}
