import locales from '@/locales';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { JSX } from 'react';

export type ConnectionMode = 'manual' | 'uri';

type Props = {
  value: ConnectionMode;
  onChange: (mode: ConnectionMode) => void;
};

/** Fill the form by hand, or paste a connection string. Same switch on every engine that has one. */
export default function ConnectionModeSwitch({ value, onChange }: Props): JSX.Element {
  return (
    <ToggleButtonGroup
      exclusive={true}
      fullWidth={true}
      size='small'
      value={value}
      data-testid='connection-mode'
      onChange={(_, next: ConnectionMode | null): void => {
        // A click on the active button deselects in MUI; keep the current mode instead.
        if (next) {
          onChange(next);
        }
      }}
    >
      <ToggleButton value='manual' data-testid='connection-mode-manual'>
        {locales.connection_mode_manual}
      </ToggleButton>
      <ToggleButton value='uri' data-testid='connection-mode-uri'>
        {locales.connection_mode_uri}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
