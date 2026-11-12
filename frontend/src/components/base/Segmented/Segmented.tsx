import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { JSX, ReactNode } from 'react';

type Option<T> = { value: T; label: ReactNode; disabled?: boolean };

/** A row of buttons where exactly one is picked: quicker to scan and click than a dropdown. */
export default function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  testId
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  testId?: string;
}): JSX.Element {
  return (
    <ToggleButtonGroup
      exclusive
      size='small'
      value={value}
      data-testid={testId}
      onChange={(_, next: T | null) => next !== null && onChange(next)}
      sx={{ flexWrap: 'wrap' }}
    >
      {options.map((o) => (
        <ToggleButton
          key={String(o.value)}
          value={o.value}
          disabled={o.disabled}
          data-testid={testId ? `${testId}-${o.value}` : undefined}
          sx={{ textTransform: 'none', px: 1.5, py: 0.5 }}
        >
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
