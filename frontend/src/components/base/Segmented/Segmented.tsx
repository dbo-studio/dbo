import { variables } from '@/core/theme/variables';
import SelectionIndicator from '@/components/base/SelectionIndicator/SelectionIndicator';
import { Box, ButtonBase } from '@mui/material';
import { type JSX, type ReactNode, useRef } from 'react';

type Option<T> = { value: T; label: ReactNode; disabled?: boolean; testId?: string };

/** A row of buttons where exactly one is picked; the highlight slides to the new choice. */
export default function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  testId,
  itemTestId = testId,
  ariaLabel
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  /** Test id of the group; its items get `<testId>-<value>`. */
  testId?: string;
  /** Prefix for the items when the group's own test id would clash with another element. */
  itemTestId?: string;
  ariaLabel?: string;
}): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <Box
      ref={rootRef}
      role='radiogroup'
      data-testid={testId}
      aria-label={ariaLabel}
      sx={(theme) => ({
        position: 'relative',
        isolation: 'isolate',
        display: 'inline-flex',
        maxWidth: '100%',
        overflowX: 'auto',
        padding: '2px',
        gap: '2px',
        borderRadius: variables.radius.medium,
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.action.hover
      })}
    >
      <SelectionIndicator rootRef={rootRef} variant='pill' />
      {options.map((o) => {
        const selected = o.value === value;

        return (
          <ButtonBase
            key={String(o.value)}
            role='radio'
            aria-checked={selected}
            disabled={o.disabled}
            data-testid={o.testId ?? (itemTestId ? `${itemTestId}-${o.value}` : undefined)}
            onClick={() => onChange(o.value)}
            sx={(theme) => ({
              px: 1.5,
              minHeight: variables.control - 4,
              whiteSpace: 'nowrap',
              borderRadius: variables.radius.small,
              fontSize: theme.typography.caption.fontSize,
              fontWeight: selected ? theme.typography.fontWeightMedium : theme.typography.fontWeightRegular,
              color: selected ? theme.palette.text.link : theme.palette.text.subdued,
              transition: `color ${variables.motion.base} ${variables.motion.easing}`,
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              '&:hover': { color: selected ? theme.palette.text.link : theme.palette.text.text },
              '&.Mui-focusVisible': { outline: `1px solid ${theme.palette.primary.main}` },
              '&.Mui-disabled': { opacity: 0.5 }
            })}
          >
            {o.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
