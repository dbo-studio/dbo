import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';

export type PlanRow = { label: string; value: ReactNode; testId?: string };

/** The whole schedule in plain words, kept in view while the form is filled, with the save button. */
export default function PlanSummary({
  rows,
  problems,
  busy,
  saveLabel,
  onSave,
  onCancel
}: {
  rows: PlanRow[];
  /** What still blocks saving, in plain words. */
  problems: string[];
  busy: boolean;
  saveLabel: string;
  onSave: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <Box
      data-testid='plan-summary'
      sx={{
        position: { lg: 'sticky' },
        top: 0,
        alignSelf: 'start',
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 0.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25
      }}
    >
      <Typography variant='subtitle2' color='textTitle'>
        {locales.backup_plan_title}
      </Typography>
      {rows.map((r) => (
        <Box key={r.label} data-testid={r.testId}>
          <Typography variant='caption' color='textSubdued' component='p'>
            {r.label}
          </Typography>
          <Typography variant='body2' component='div'>
            {r.value}
          </Typography>
        </Box>
      ))}
      {problems.length > 0 && (
        <Box data-testid='plan-problems'>
          {problems.map((p) => (
            <Typography key={p} variant='caption' color='warning.main' component='p'>
              {p}
            </Typography>
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 0.5 }}>
        <Button size='small' onClick={onCancel}>
          {locales.cancel}
        </Button>
        <Button
          size='small'
          variant='contained'
          disabled={busy || problems.length > 0}
          onClick={onSave}
          data-testid='schedule-save'
        >
          {saveLabel}
        </Button>
      </Box>
    </Box>
  );
}
