import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Search from '@/components/base/Search/Search';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SnippetCardStyled, SnippetChipsStyled, SnippetHeaderStyled } from './SqlSnippets.styled';
import { useCurrentConnection } from '@/hooks';
import { hasEditorTab, isMongoDriver, isNoSQLType, isRedisDriver } from '@/core/db/connectionAliases';
import { MONGO_SNIPPETS, REDIS_SNIPPETS } from './nosqlSnippets';
import { SQL_SNIPPETS, type SqlSnippetGroup } from './snippets';

/** The snippet set that fits the connection: shell statements for MongoDB, commands for Redis, SQL otherwise. */
function snippetsFor(type: string | undefined): SqlSnippetGroup[] {
  if (isMongoDriver(type)) return MONGO_SNIPPETS;
  if (isRedisDriver(type)) return REDIS_SNIPPETS;
  return SQL_SNIPPETS;
}

export default function SqlSnippets(): JSX.Element {
  const type = useCurrentConnection()?.type;
  const snippets = useMemo(() => snippetsFor(type), [type]);
  // Redis has no editor tab, so a snippet can only be copied.
  const canOpen = hasEditorTab(type);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snippets
      .filter((g) => !group || g.group === group)
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => !q || i.title.toLowerCase().includes(q) || i.sql.toLowerCase().includes(q))
      }))
      .filter((g) => g.items.length > 0);
  }, [search, group, snippets]);

  return (
    <Box
      data-testid={isNoSQLType(type) ? 'nosql-snippets' : 'sql-snippets'}
      sx={{ mt: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Search onChange={setSearch} />
      <SnippetChipsStyled>
        <Chip label='All' size='small' color={group ? 'default' : 'primary'} onClick={(): void => setGroup(null)} />
        {snippets.map((g) => (
          <Chip
            key={g.group}
            label={g.group}
            size='small'
            color={group === g.group ? 'primary' : 'default'}
            onClick={(): void => setGroup(group === g.group ? null : g.group)}
          />
        ))}
      </SnippetChipsStyled>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {groups.length === 0 && <EmptyState title='No snippets found' />}
        {groups.map(({ group: name, items }) => (
          <Box key={name} sx={{ mb: 1.5 }}>
            {!group && (
              <Typography variant='overline' sx={{ display: 'block', mb: 0.5 }}>
                {name}
              </Typography>
            )}
            {items.map(({ title, sql }) => (
              <SnippetCardStyled key={title} data-testid='sql-snippet'>
                <SnippetHeaderStyled>
                  <Typography variant='caption' noWrap sx={{ fontWeight: 600 }}>
                    {title}
                  </Typography>
                  <Stack direction='row' className='snippet-actions'>
                    <Tooltip title={locales.ai_changes_copy}>
                      <IconButton
                        size='small'
                        aria-label={locales.ai_changes_copy}
                        onClick={(): void => {
                          void navigator.clipboard.writeText(sql).then(() => toast.success(locales.ai_changes_copied));
                        }}
                      >
                        <CustomIcon type='copy' size='xs' />
                      </IconButton>
                    </Tooltip>
                    {canOpen && (
                      <Tooltip title={locales.ai_changes_open_query}>
                        <IconButton
                          size='small'
                          aria-label={locales.ai_changes_open_query}
                          onClick={(): void => {
                            useTabStore.getState().addEditorTab(sql, { forceNew: true });
                          }}
                        >
                          <CustomIcon type='sql' size='xs' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </SnippetHeaderStyled>
                <SyntaxHighlighter value={sql} />
              </SnippetCardStyled>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
