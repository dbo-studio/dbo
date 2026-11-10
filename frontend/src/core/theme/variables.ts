/**
 * UI baseline contract. Every control, dialog and icon takes its size from here
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
    medium: '6px',
    large: '8px'
  },
  control: {
    sm: 24,
    md: 28
  },
  shadow: {
    popover: '0 6px 16px -4px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04)',
    modal: '0 16px 40px -8px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.05)'
  },
  modal: {
    sm: 400,
    md: 512,
    lg: 768
  },
  icon: {
    xs: 12,
    s: 16,
    m: 20,
    l: 28
  }
};
