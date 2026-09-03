import Kbd from '@/components/base/Kbd/Kbd';
import Search from '@/components/base/Search/Search';
import { SHORTCUT_GROUP_ORDER, shortcuts } from '@/core/utils/shortcuts';
import locales from '@/locales';
import type { ShortcutGroup, ShortcutType } from '@/types';
import { Box, Grid, Typography } from '@mui/material';
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
      <Box sx={{ mb: 2, width: { xs: '100%', sm: '50%' } }}>
        <Search onChange={setQuery} placeholder={locales.search_shortcuts} />
      </Box>

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
