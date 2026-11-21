import { alpha, Box, useTheme } from '@mui/material';
import type { JSX } from 'react';

const TYPE_LABEL: Record<string, string> = {
  string: 'STR',
  hash: 'HASH',
  list: 'LIST',
  set: 'SET',
  zset: 'ZSET',
  stream: 'STRM',
  'ReJSON-RL': 'JSON'
};

export default function TypeBadge({ type }: { type: string }): JSX.Element {
  const { palette } = useTheme();
  const color =
    {
      string: palette.info.main,
      hash: palette.success.main,
      list: palette.warning.main,
      set: palette.secondary.main,
      zset: palette.error.main
    }[type] ?? palette.text.secondary;

  return (
    <Box
      aria-label={type}
      sx={{
        width: 40,
        flexShrink: 0,
        textAlign: 'center',
        borderRadius: 0.75,
        py: '1px',
        typography: 'caption',
        fontWeight: 600,
        lineHeight: 1.4,
        color,
        bgcolor: alpha(color, 0.2)
      }}
    >
      {TYPE_LABEL[type] ?? type.slice(0, 4).toUpperCase()}
    </Box>
  );
}
