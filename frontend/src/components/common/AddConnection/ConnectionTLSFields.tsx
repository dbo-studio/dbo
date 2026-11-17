import locales from '@/locales';
import { Box, Checkbox, FormControlLabel } from '@mui/material';
import type { JSX } from 'react';

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** Engines that can skip certificate verification pass both. */
  insecure?: boolean;
  onInsecureChange?: (insecure: boolean) => void;
};

/** The SSL / TLS section of engines without certificate files: on/off, and optionally skip-verify. */
export default function ConnectionTLSFields({
  enabled,
  onEnabledChange,
  insecure,
  onInsecureChange
}: Props): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <FormControlLabel
        control={
          <Checkbox
            size='small'
            checked={enabled}
            slotProps={{ input: { 'data-testid': 'tls-enabled' } as object }}
            onChange={(e): void => onEnabledChange(e.target.checked)}
          />
        }
        label={locales.redis_tls}
      />
      {enabled && onInsecureChange && (
        <Box sx={{ pl: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                size='small'
                checked={Boolean(insecure)}
                slotProps={{ input: { 'data-testid': 'tls-insecure' } as object }}
                onChange={(e): void => onInsecureChange(e.target.checked)}
              />
            }
            label={locales.redis_tls_insecure}
          />
        </Box>
      )}
    </Box>
  );
}
