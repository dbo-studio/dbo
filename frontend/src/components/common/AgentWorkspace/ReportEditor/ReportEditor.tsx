import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import ChartView from '@/components/common/ChartView/ChartView';
import type { ChartReport } from '@/components/common/AiChatPanel/utils/chartReport';
import { useSaveReport } from '@/components/common/AiChatPanel/hooks/useSaveReport';
import PinReportButton from '../PinReportButton/PinReportButton';
import { CHART_TYPES, numericColumns, type ChartType } from '@/core/charts/chartSpec';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, Button, CircularProgress, FormControlLabel, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type JSX } from 'react';

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
  const [edited, setEdited] = useState<ChartReport>(report);
  const [sql, setSql] = useState(report.sql);
  // A newer chart from the agent replaces what was being edited.
  const [shownId, setShownId] = useState(report.id);
  if (shownId !== report.id) {
    setShownId(report.id);
    setEdited(report);
    setSql(report.sql);
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
  const {
    mutate: run,
    isPending,
    error
  } = useMutation({
    mutationFn: async () => {
      const { database, schema } = scope ?? useAiStore.getState().context;
      return api.query.runRawQuery({ connectionId: Number(connectionId), query: sql, database, schema });
    },
    onSuccess: (result) => {
      const columns = result.columns?.map((column) => column.name) ?? Object.keys(result.data[0] ?? {});
      setEdited((current) => ({ ...current, sql, rows: result.data, columns }));
    }
  });

  const measures = numericColumns(edited.rows, edited.columns);
  const option = (value: string): SelectInputOption => ({ value, label: value });

  return (
    <Stack spacing={1.5} data-testid='ai-report-editor'>
      <FieldInput
        value={edited.title}
        onChange={(event) => setEdited({ ...edited, title: event.target.value })}
        inputProps={{ 'aria-label': locales.ai_report_name, 'data-testid': 'ai-report-title' }}
        mb={0}
      />
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
              slotProps={{ input: { 'data-testid': 'ai-report-stacked' } as React.InputHTMLAttributes<HTMLInputElement> }}
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
      <ChartView rows={edited.rows} columns={edited.columns} spec={edited.spec} height={320} />
      <Box
        data-testid='ai-report-sql'
        sx={{ display: 'flex', height: 160, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
      >
        <SqlEditor
          editorHeight={160}
          value={sql}
          onChange={setSql}
          autocomplete={autocomplete ?? EMPTY_AUTOCOMPLETE}
          onRunQuery={() => run()}
        />
      </Box>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Button
          size='small'
          variant='contained'
          disabled={isPending || !sql.trim()}
          onClick={() => run()}
          startIcon={isPending ? <CircularProgress size={12} color='inherit' /> : undefined}
          data-testid='ai-report-run'
        >
          {locales.ai_report_run}
        </Button>
        <Button
          size='small'
          variant='outlined'
          disabled={saving || !edited.title.trim()}
          onClick={() => save({ ...edited, sql }, { onSuccess: (saved) => setEdited(saved) })}
          data-testid='ai-report-save-canvas'
        >
          {locales.ai_report_save}
        </Button>
        <PinReportButton report={{ ...edited, sql }} onSaved={setEdited} />
        {error && (
          <Typography variant='caption' color='error'>
            {error.message}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
