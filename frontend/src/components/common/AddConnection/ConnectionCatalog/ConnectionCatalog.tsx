import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Search from '@/components/base/Search/Search';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';
import { CATALOG_GROUPS } from '../connectionCatalog';
import type { SelectionConnectionType } from '../types';
import {
  CatalogGroupLabelStyled,
  CatalogItemStyled,
  CatalogListStyled,
  CatalogRootStyled
} from './ConnectionCatalog.styled';

type Props = {
  connections: SelectionConnectionType[];
  selected: string | undefined;
  onSelect: (connection: SelectionConnectionType) => void;
};

/** The left rail of New connection: every engine in one scannable, searchable list. */
export default function ConnectionCatalog({ connections, selected, onSelect }: Props): JSX.Element {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = connections.filter((c) => c.name.toLowerCase().includes(q));
    const placed = new Set(CATALOG_GROUPS.flatMap((g) => g.types));
    return CATALOG_GROUPS.map((g) => ({
      ...g,
      items: g.types.map((t) => matches.find((c) => c.type === t)).filter((c) => c !== undefined)
    }))
      .map((g, i, all) =>
        i === all.length - 1 ? { ...g, items: [...g.items, ...matches.filter((c) => !placed.has(c.type))] } : g
      )
      .filter((g) => g.items.length > 0);
  }, [connections, query]);

  return (
    <CatalogRootStyled>
      <Search onChange={setQuery} />
      <CatalogListStyled
        role='listbox'
        aria-label={locales.new_connection}
        onKeyDown={(e): void => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          const flat = groups.flatMap((g) => g.items);
          const at = flat.findIndex((c) => c.type === selected);
          const next = flat[Math.min(flat.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))];
          if (!next) return;
          const list = e.currentTarget;
          onSelect(next);
          requestAnimationFrame(() => list.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
        }}
      >
        {groups.length === 0 && (
          <Typography variant='caption' color='textSecondary' sx={{ px: 1, py: 2 }}>
            {locales.connection_no_engine_match}
          </Typography>
        )}
        {groups.map((group) => (
          <div key={group.id}>
            <CatalogGroupLabelStyled variant='overline'>{group.label}</CatalogGroupLabelStyled>
            {group.items.map((c) => (
              <CatalogItemStyled
                key={c.type}
                role='option'
                tabIndex={0}
                aria-selected={c.type === selected}
                selected={c.type === selected}
                data-testid={`selected-connection-${c.name}`}
                onClick={(): void => onSelect(c)}
                onKeyDown={(e): void => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(c);
                  }
                }}
              >
                <CustomIcon type={c.logo} size='m' />
                <Typography variant='body2' color='textTitle' noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {c.name}
                </Typography>
              </CatalogItemStyled>
            ))}
          </div>
        ))}
      </CatalogListStyled>
    </CatalogRootStyled>
  );
}
