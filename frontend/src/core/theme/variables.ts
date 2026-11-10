/**
 * UI baseline contract. Every control and icon takes its size from here
 * (directly, or through the MUI `size` prop wired up in `overrides/`).
 *
 * Controls (Button, Input, Select, Tab):
 *   default (`size="medium"`) → control.md — use for forms, dialogs, toolbars.
 *   `size="small"`            → control.sm — only inside dense surfaces
 *                               (data grid cells, tree rows, inline filters).
 * Never hardcode a control height; never use `large`.
 */
export const variables = {
  radius: {
    small: '4px',
    medium: '5px',
    large: '12px'
  },
  control: {
    sm: 24,
    md: 28
  },
  icon: {
    xs: 12,
    s: 16,
    m: 20,
    l: 28
  },
  // Short UI motion; components disable it under prefers-reduced-motion.
  motion: {
    fast: '100ms',
    base: '120ms',
    easing: 'cubic-bezier(0.2, 0, 0, 1)'
  },
  // Type scale for text that is not covered by a typography variant (captions, chips, dense labels).
  fontSize: {
    xxs: '0.625rem',
    xs: '0.6875rem',
    sm: '0.75rem',
    md: '0.8125rem',
    lg: '0.875rem',
    xl: '1rem',
    xxl: '1.125rem',
    xxxl: '1.25rem'
  }
};
