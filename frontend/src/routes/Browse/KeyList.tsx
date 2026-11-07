import type { NoSQLItem } from '@/api/nosql/types';
import locales from '@/locales';
import { alpha, Box, Tooltip, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import type { KeyRow } from './keyTree';

const TYPE_LABEL: Record<string, string> = {
  string: 'STR',
  hash: 'HASH',
  list: 'LIST',
  set: 'SET',
  zset: 'ZSET',
  stream: 'STRM',
  'ReJSON-RL': 'JSON'
};

function TypeBadge({ type }: { type: string }): JSX.Element {
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

type Props = {
  rows: KeyRow[];
  expanded: Set<string>;
  selectedId: string | null;
  loading: boolean;
  onSelect: (item: NoSQLItem) => void;
  onToggle: (folder: string) => void;
};

/** The key tree: folders with counts, then keys with a fixed-width type badge so names line up. */
export default function KeyList({ rows, expanded, selectedId, loading, onSelect, onToggle }: Props): JSX.Element {
  return (
    <Box sx={{ height: '100%', overflow: 'auto', py: 0.5 }} data-testid='browse-list'>
      {rows.length === 0 && !loading && (
        <Typography sx={{ p: 2 }} color='text.secondary'>
          {locales.nosql_no_items}
        </Typography>
      )}
      {rows.map((row) => {
        const selected = !!row.item && row.item.id === selectedId;
        const type = typeof row.item?.meta?.type === 'string' ? row.item.meta.type : '';

        return (
          <Tooltip key={row.key} title={row.item?.id ?? row.folder ?? ''} enterDelay={700} placement='right'>
            <Box
              role='button'
              tabIndex={0}
              data-testid={row.item && !row.folder ? 'browse-item' : 'browse-folder'}
              data-item-id={row.item?.id}
              onClick={(): void => (row.item && !row.folder ? onSelect(row.item) : row.folder && onToggle(row.folder))}
              onKeyDown={(e): void => {
                if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click();
              }}
              sx={{
                ml: 0.5,
                mr: 0.5,
                pl: 0.5 + row.depth * 1.75,
                pr: 0.75,
                minHeight: 28,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                cursor: 'pointer',
                borderRadius: 1,
                bgcolor: selected ? 'action.selected' : undefined,
                '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
                '&:focus-visible': {
                  outline: 2,
                  outlineStyle: 'solid',
                  outlineColor: 'primary.main',
                  outlineOffset: -2
                }
              }}
            >
              {row.folder ? (
                <>
                  <span aria-hidden style={{ width: 14, textAlign: 'center', opacity: 0.7 }}>
                    {expanded.has(row.folder) ? '▾' : '▸'}
                  </span>
                  <Typography noWrap variant='body2' sx={{ flex: 1, minWidth: 0, fontWeight: 500 }}>
                    {row.label}
                  </Typography>
                  <Typography variant='caption' color='textSubdued' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row.count}
                  </Typography>
                </>
              ) : (
                <>
                  {type && <TypeBadge type={type} />}
                  <Typography noWrap variant='body2' sx={{ flex: 1, minWidth: 0 }}>
                    {row.label}
                  </Typography>
                </>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
