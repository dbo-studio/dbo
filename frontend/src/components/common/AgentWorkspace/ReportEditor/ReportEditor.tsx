import { variables } from '@/core/theme/variables';
import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import CodeEditor from '@/components/base/CodeEditor/CodeEditor';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor';
import { isNoSQLType } from '@/core/db/connectionAliases';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import ChartView from '@/components/common/ChartView/ChartView';
import type { ChartReport } from '@/components/common/AiChatPanel/utils/chartReport';
import { useSaveReport } from '@/components/common/AiChatPanel/hooks/useSaveReport';
import PinReportButton from '../PinReportButton/PinReportButton';
import ParamInput from '../ParamInput/ParamInput';
import { CHART_TYPES, numericColumns, questionParams, type ChartType } from '@/core/charts/chartSpec';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState, type JSX } from 'react';

const EMPTY_AUTOCOMPLETE = { databases: [], views: [], schemas: [], tables: [], columns: {} };

/** The canvas's Report tab: the agent's chart large, with its SQL, type and axes editable, like a Metabase question. */
export default function ReportEditor({
  report,
  scope
}: {
  report: ChartReport;
  /** Database and schema to run in. The workstation omits it and follows the chat's context. */
  scope?: { database?: string; schema?: string };
}): JSX.Element {
  const connectionId = useConnectionStore((state) => state.currentConnectionId);
  // A MongoDB or Redis report is a JSON pipeline or command: no SQL editor. Its {{filters}} still take values.
  const noSql = isNoSQLType(useCurrentConnection()?.type);
  const [edited, setEdited] = useState<ChartReport>(report);
  const [sql, setSql] = useState(report.sql);
  // Values for the {{filters}}; saving keeps them as the report's defaults.
  const [params, setParams] = useState<Record<string, string>>(report.params ?? {});
  // A newer chart from the agent replaces what was being edited.
  const [shownId, setShownId] = useState(report.id);
  if (shownId !== report.id) {
    setShownId(report.id);
    setEdited(report);
    setSql(report.sql);
    setParams(report.params ?? {});
  }

  const chatContext = useAiStore((state) => state.context);
  const { database, schema } = scope ?? chatContext;
  // The chat already loads this for its @ menu; the editor shares the cached copy.
  const { data: autocomplete } = useQuery({
    queryKey: ['ai_autocomplete', connectionId, database, schema],
    queryFn: () => api.query.autoComplete({ connectionId: Number(connectionId), database, schema }),
    enabled: !!connectionId
  });

  const { mutate: save, isPending: saving } = useSaveReport();
  const runControllerRef = useRef<AbortController | null>(null);
  const {
    mutate: run,
    isPending,
    error
  } = useMutation({
    mutationFn: async () => {
      const { database, schema } = scope ?? useAiStore.getState().context;
      runControllerRef.current = new AbortController();
      return api.question.previewQuestion(
        { connectionId: Number(connectionId), sql, params, database, schema },
        runControllerRef.current.signal
      );
    },
    onSuccess: (result) => {
      const columns = result.columns?.map((column) => column.name) ?? Object.keys(result.rows[0] ?? {});
      setEdited((current) => ({ ...current, sql, rows: result.rows, columns }));
    }
  });

  const measures = numericColumns(edited.rows, edited.columns);
  const option = (value: string): SelectInputOption => ({ value, label: value });

  const patchSpec = (next: Partial<typeof edited.spec>): void =>
    setEdited({ ...edited, spec: { ...edited.spec, ...next } });
  const picked = (value: unknown): string => (value as SelectInputOption).value as string;
  // The chart types with more than an x and one measure ask for the rest here.
  const extras = (
    <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
      {(edited.spec.type === 'heatmap' || edited.spec.type === 'pivot') && (
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <SelectInput
            label={locales.ai_report_group}
            testId='ai-report-group'
            value={edited.spec.group}
            options={edited.columns.map(option)}
            onChange={(value) => patchSpec({ group: picked(value) })}
          />
        </Box>
      )}
      {edited.spec.type === 'combo' && (
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <SelectInput
            label={locales.ai_report_line}
            testId='ai-report-line'
            value={edited.spec.y[1]}
            options={measures.filter((measure) => measure !== edited.spec.y[0]).map(option)}
            onChange={(value) => patchSpec({ y: [edited.spec.y[0], picked(value)] })}
          />
        </Box>
      )}
      {edited.spec.type === 'scatter' && (
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <SelectInput
            label={locales.ai_report_size}
            testId='ai-report-size'
            value={edited.spec.size}
            options={measures.map(option)}
            onChange={(value) => patchSpec({ size: picked(value) })}
          />
        </Box>
      )}
      {edited.spec.type === 'gauge' && (
        <FieldInput
          type='number'
          placeholder={locales.ai_report_goal}
          value={edited.spec.goal ?? ''}
          onChange={(event) => patchSpec({ goal: Number(event.target.value) || undefined })}
          inputProps={{ 'aria-label': locales.ai_report_goal, 'data-testid': 'ai-report-goal' }}
          mb={0}
        />
      )}
    </Stack>
  );

  return (
    <Stack spacing={1.5} data-testid='ai-report-editor'>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FieldInput
            value={edited.title}
            onChange={(event) => setEdited({ ...edited, title: event.target.value })}
            inputProps={{ 'aria-label': locales.ai_report_name, 'data-testid': 'ai-report-title' }}
            mb={0}
          />
        </Box>
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Button
            variant='contained'
            disabled={isPending || !sql.trim()}
            onClick={() => run()}
            startIcon={isPending ? <CircularProgress size={12} color='inherit' /> : undefined}
            data-testid='ai-report-run'
          >
            {locales.ai_report_run}
          </Button>
          {isPending && (
            <Button onClick={() => runControllerRef.current?.abort()} data-testid='ai-report-cancel'>
              {locales.cancel}
            </Button>
          )}
          <Button
            variant='outlined'
            disabled={saving || !edited.title.trim()}
            onClick={() => save({ ...edited, sql, params }, { onSuccess: (saved) => setEdited(saved) })}
            data-testid='ai-report-save-canvas'
          >
            {locales.ai_report_save}
          </Button>
          <PinReportButton report={{ ...edited, sql, params }} onSaved={setEdited} />
        </Stack>
      </Stack>
      <ToggleButtonGroup
        exclusive
        size='small'
        value={edited.spec.type}
        onChange={(_, type: ChartType | null) => type && setEdited({ ...edited, spec: { ...edited.spec, type } })}
        sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { py: 0.25, px: 1, textTransform: 'none' } }}
      >
        {CHART_TYPES.map((type) => (
          <ToggleButton key={type} value={type} data-testid={`ai-report-type-${type}`}>
            {locales[`ai_chart_type_${type}`]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {['bar', 'row', 'area'].includes(edited.spec.type) && (
        <FormControlLabel
          label={locales.ai_report_stacked}
          control={
            <Switch
              size='small'
              checked={!!edited.spec.stacked}
              onChange={(event) => setEdited({ ...edited, spec: { ...edited.spec, stacked: event.target.checked } })}
              slotProps={{
                input: { 'data-testid': 'ai-report-stacked' } as React.InputHTMLAttributes<HTMLInputElement>
              }}
            />
          }
        />
      )}
      <Stack direction='row' spacing={1}>
        <Box sx={{ flex: 1 }}>
          <SelectInput
            label={locales.ai_report_x}
            testId='ai-report-x'
            value={edited.spec.x}
            options={edited.columns.map(option)}
            onChange={(value) =>
              setEdited({ ...edited, spec: { ...edited.spec, x: (value as SelectInputOption).value as string } })
            }
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <SelectInput
            label={locales.ai_report_y}
            testId='ai-report-y'
            value={edited.spec.y[0]}
            options={measures.map(option)}
            onChange={(value) =>
              setEdited({ ...edited, spec: { ...edited.spec, y: [(value as SelectInputOption).value as string] } })
            }
          />
        </Box>
      </Stack>
      {extras}
      <ChartView rows={edited.rows} columns={edited.columns} spec={edited.spec} height={320} />
      <Box
        data-testid='ai-report-sql'
        sx={{
          display: 'flex',
          height: 160,
          border: 1,
          borderColor: 'divider',
          borderRadius: variables.radius.small,
          overflow: 'hidden'
        }}
      >
        {noSql ? (
          <CodeEditor value={sql} onChange={setSql} language='json' />
        ) : (
          <SqlEditor
            editorHeight={160}
            value={sql}
            onChange={setSql}
            autocomplete={autocomplete ?? EMPTY_AUTOCOMPLETE}
            onRunQuery={() => run()}
          />
        )}
      </Box>
      {error && (
        <Typography variant='caption' color='error'>
          {error.message}
        </Typography>
      )}
      {questionParams(sql).length > 0 && (
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }} data-testid='ai-report-params'>
          {questionParams(sql).map((param) => (
            <ParamInput
              key={param.name}
              param={param}
              value={params[param.name] ?? ''}
              onChange={(value) => setParams((current) => ({ ...current, [param.name]: value }))}
              onCommit={() => undefined}
              connectionId={Number(connectionId)}
              scope={{ database, schema }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
