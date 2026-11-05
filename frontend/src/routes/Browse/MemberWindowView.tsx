import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import api from '@/api';
import type { NoSQLItem, NoSQLMemberOp } from '@/api/nosql/types';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, type UIEvent, useState } from 'react';
import { toast } from 'sonner';

const PAGE = 100;

type Props = { item: NoSQLItem; connectionId: number; containerId: string; editable: boolean };

/**
 * Big collections: members load a window at a time (infinite scroll) and are edited one by one,
 * so a key with millions of members is neither loaded nor rewritten whole.
 */
export default function MemberWindowView({ item, connectionId, containerId, editable }: Props): JSX.Element {
  const qc = useQueryClient();
    const scored = !!item.meta?.scored;
  const type = typeof item.meta?.type === 'string' ? item.meta.type : '';
  const keyed = type === 'hash' || scored;
  const ref = { connectionId, containerId, itemId: item.id };
  const queryKey = ['nosql', 'window', connectionId, containerId, item.id];
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');

  const q = useInfiniteQuery({
    queryKey,
    initialPageParam: '',
    queryFn: ({ pageParam }) => api.nosql.memberWindow({ connectionId, containerId, itemId: item.id, cursor: pageParam, limit: PAGE }),
    getNextPageParam: (last) => last.nextCursor || undefined
  });

  const members = q.data?.pages.flatMap((p) => p.members) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  const apply = async (op: NoSQLMemberOp): Promise<void> => {
    try {
      await withSafeModeRetry(async (confirmed) => {
        await api.nosql.applyMember({ ...ref, op, confirmed });
        return true;
      });
      await qc.invalidateQueries({ queryKey });
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const onScroll = (e: UIEvent<HTMLElement>): void => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && q.hasNextPage && !q.isFetchingNextPage) {
      void q.fetchNextPage();
    }
  };

  const setOp = (key: string, value: string): NoSQLMemberOp =>
    scored
      ? { op: 'set', key, value: '', score: Number(value) }
      : { op: type === 'list' && !key ? 'append' : 'set', key, value };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-testid='member-window'>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1 }} onScroll={onScroll} data-testid='member-window-scroll'>
        <Table size='small' stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>{type === 'list' ? '#' : type === 'hash' ? locales.nosql_field : locales.nosql_member}</TableCell>
              {(keyed || type === 'list') && (
                <TableCell>{scored ? locales.nosql_score : locales.nosql_value}</TableCell>
              )}
              {editable && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((m) => {
              const shown = scored ? String(m.score) : m.value;
              return (
                <TableRow key={m.key}>
                  <TableCell>{m.key}</TableCell>
                  {(keyed || type === 'list') && (
                    <TableCell>
                      {editable ? (
                        <TextField
                          size='small'
                          variant='standard'
                          fullWidth
                          defaultValue={shown}
                          onBlur={(e): void => {
                            if (e.target.value !== shown) void apply(setOp(m.key, e.target.value));
                          }}
                        />
                      ) : (
                        shown
                      )}
                    </TableCell>
                  )}
                  {editable && (
                    <TableCell>
                      <IconButton
                        aria-label={locales.nosql_remove_row}
                        size='small'
                        onClick={(): void => void apply({ op: 'remove', key: m.key, value: m.value })}
                      >
                        <CustomIcon type='close' size='s' />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant='caption' data-testid='member-window-count'>
          {locales.nosql_members_loaded.replace('{loaded}', String(members.length)).replace('{total}', String(total))}
        </Typography>
        {editable && (
          <>
            {type !== 'list' && (
              <TextField size='small' value={draftKey} onChange={(e): void => setDraftKey(e.target.value)} placeholder={locales.nosql_member} />
            )}
            {(keyed || type === 'list') && (
              <TextField
                size='small'
                value={draftValue}
                onChange={(e): void => setDraftValue(e.target.value)}
                placeholder={scored ? locales.nosql_score : locales.nosql_value}
              />
            )}
            <Button
              size='small'
              variant='contained'
              disabled={type === 'list' ? !draftValue : !draftKey}
              onClick={(): void => {
                void apply(setOp(type === 'list' ? '' : draftKey, draftValue)).then(() => {
                  setDraftKey('');
                  setDraftValue('');
                });
              }}
            >
              {locales.nosql_add_row}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
