import { variables } from '@/core/theme/variables';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';
import ConnectorIcon from './ConnectorIcon';

type Props = {
  type: string;
  label: string;
  testId: string;
  /** Radio semantics inside the form's type picker; a plain button in the add grid. */
  selected?: boolean;
  onSelect: () => void;
};

/** One connector type as a tile. The add grid and the form's type picker share it, so opening the form never resizes the tiles. */
export default function ConnectorTypeTile({ type, label, testId, selected, onSelect }: Props): JSX.Element {
  const isRadio = selected !== undefined;

  return (
    <Box
      role={isRadio ? 'radio' : 'button'}
      aria-checked={isRadio ? selected : undefined}
      tabIndex={0}
      data-testid={testId}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || (isRadio && e.key === ' ')) && (e.preventDefault(), onSelect())}
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        minHeight: 44,
        cursor: 'pointer',
        borderRadius: variables.radius.medium,
        border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
        background: selected ? theme.palette.action.selected : 'transparent',
        '&:hover': { borderColor: theme.palette.primary.main },
        '&:focus-visible': { outline: `1px solid ${theme.palette.primary.main}` }
      })}
    >
      <ConnectorIcon type={type} size={28} />
      <Typography variant='body2' color='textTitle' sx={{ lineHeight: 1.25, minWidth: 0 }}>
        {label}
      </Typography>
    </Box>
  );
}
