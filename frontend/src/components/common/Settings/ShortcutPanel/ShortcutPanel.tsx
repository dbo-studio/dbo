import Kbd from '@/components/base/Kbd/Kbd';
import { SHORTCUT_GROUP_ORDER, shortcuts } from '@/core/utils/shortcuts';
import locales from '@/locales';
import type { ShortcutGroup, ShortcutType } from '@/types';
import { Box, Grid, TextField, Typography } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

const GROUP_LABELS: Record<ShortcutGroup, string> = {
  editor: locales.shortcut_group_editor,
  tabs: locales.shortcut_group_tabs,
  grid: locales.shortcut_group_grid,
  app: locales.shortcut_group_app
};

export default function ShortcutPanel(): JSX.Element {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const entries = Object.values(shortcuts).filter((item: ShortcutType) => {
      if (!normalized) {
        return true;
      }
      const haystack = `${item.label} ${item.command.join(' ')} ${item.id}`.toLowerCase();
      return haystack.includes(normalized);
    });

    return SHORTCUT_GROUP_ORDER.map((group) => ({
      group,
      items: entries.filter((item) => item.group === group)
    })).filter((section) => section.items.length > 0);
  }, [query]);

  return (
    <Box>
      <TextField
        size='small'
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={locales.search_shortcuts}
        aria-label={locales.search_shortcuts}
        sx={{ mb: 2 }}
      />

      {grouped.map((section) => (
        <Box key={section.group} sx={{ mb: 2 }}>
          <Typography variant='subtitle2' color='textSecondary' sx={{ mb: 1 }}>
            {GROUP_LABELS[section.group]}
          </Typography>
          {section.items.map((value) => (
            <Grid
              key={value.id}
              container
              spacing={2}
              sx={{
                mt: 0.5,
                alignItems: 'center'
              }}
            >
              <Grid size={{ md: 8 }}>
                <Typography color='textText' variant='body2'>
                  {value.label}
                </Typography>
              </Grid>
              <Grid size={{ md: 4 }}>
                <Kbd commands={value.command} />
              </Grid>
            </Grid>
          ))}
        </Box>
      ))}
    </Box>
  );
}
