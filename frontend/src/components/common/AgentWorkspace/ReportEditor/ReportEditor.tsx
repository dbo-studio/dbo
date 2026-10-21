import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import ChartView from '@/components/common/ChartView/ChartView';
import type { ChartReport } from '@/components/common/AiChatPanel/utils/chartReport';
import { useSaveReport } from '@/components/common/AiChatPanel/hooks/useSaveReport';
import { CHART_TYPES, numericColumns, type ChartType } from '@/core/charts/chartSpec';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState, type JSX } from 'react';

/** The canvas's Report tab: the agent's chart large, with its SQL, type and axes editable, like a Metabase question. */
export default function ReportEditor({ report }: { report: ChartReport }): JSX.Element {
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

  const { mutate: save, isPending: saving } = useSaveReport();
  const {
    mutate: run,
    isPending,
    error
  } = useMutation({
    mutationFn: async () => {
      const { database, schema } = useAiStore.getState().context;
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
      <TextField
        size='small'
        value={edited.title}
        onChange={(event) => setEdited({ ...edited, title: event.target.value })}
        slotProps={{ htmlInput: { 'aria-label': locales.ai_report_name, 'data-testid': 'ai-report-title' } }}
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
      <TextField
        multiline
        minRows={3}
        value={sql}
        onChange={(event) => setSql(event.target.value)}
        slotProps={{ htmlInput: { 'data-testid': 'ai-report-sql', spellCheck: false } }}
        sx={{ '& textarea': { fontFamily: 'monospace' } }}
      />
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
        {error && (
          <Typography variant='caption' color='error'>
            {error.message}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
