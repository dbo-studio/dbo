import api from '@/api';
import type { DashboardShareType, DashboardType } from '@/api/dashboard/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESETS = [
  { label: locales.share_expiry_1d, days: 1 },
  { label: locales.share_expiry_7d, days: 7 },
  { label: locales.share_expiry_30d, days: 30 },
  { label: locales.share_expiry_never, days: 0 }
];

/** The end of the picked day in the user's time zone, as the server wants it. */
const endOfDay = (date: string): string => new Date(`${date}T23:59:59`).toISOString();
const toDateInput = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('sv') : '');
const inDays = (days: number): string => new Date(Date.now() + days * DAY_MS).toLocaleDateString('sv');

const status = (share: DashboardShareType): 'revoked' | 'expired' | 'active' =>
  share.revoked ? 'revoked' : share.expiresAt && new Date(share.expiresAt) <= new Date() ? 'expired' : 'active';

function ShareRow({ boardId, share }: { boardId: number; share: DashboardShareType }): JSX.Element {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(() => toDateInput(share.expiresAt));
  const [password, setPassword] = useState('');
  const state = status(share);
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['dashboard-shares', boardId] });

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      api.dashboard.updateShare(boardId, share.id, {
        ...(date ? { expiresAt: endOfDay(date) } : { clearExpiry: true }),
        // Empty leaves the password alone; the remove button sends an empty one itself.
        ...(password ? { password } : {})
      }),
    onSuccess: async () => {
      await refresh();
      setEditing(false);
      setPassword('');
    },
    onError: () => toast.error(locales.action_failed)
  });
  const { mutate: removePassword } = useMutation({
    mutationFn: () => api.dashboard.updateShare(boardId, share.id, { password: '' }),
    onSuccess: refresh,
    onError: () => toast.error(locales.action_failed)
  });
  const { mutate: revoke } = useMutation({
    mutationFn: () => api.dashboard.revokeShare(boardId, share.id),
    onSuccess: refresh,
    onError: () => toast.error(locales.action_failed)
  });

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }} data-testid='share-row' data-status={state}>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Chip size='small' label={locales[`share_status_${state}`]} color={state === 'active' ? 'success' : 'default'} />
        <Typography variant='caption' sx={{ flex: 1 }}>
          {new Date(share.createdAt).toLocaleDateString()} ·{' '}
          {share.expiresAt
            ? locales.share_expires_on.replace('{date}', new Date(share.expiresAt).toLocaleDateString())
            : locales.share_expiry_never}
          {share.hasPassword && ` · ${locales.share_password_set}`}
          {` · ${locales.share_views.replace('{count}', String(share.viewCount))}`}
          {share.lastViewedAt && ` · ${locales.share_last_viewed.replace('{date}', new Date(share.lastViewedAt).toLocaleString())}`}
        </Typography>
        {state !== 'revoked' && (
          <>
            <Button size='small' onClick={() => setEditing(!editing)} data-testid='share-edit'>
              {locales.share_edit}
            </Button>
            <Button size='small' color='error' onClick={() => revoke()} data-testid='share-revoke'>
              {locales.share_revoke}
            </Button>
          </>
        )}
      </Stack>
      {editing && state !== 'revoked' && (
        <Stack direction='row' spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <FieldInput
            size='small'
            type='date'
            value={date}
            onChange={(event) => setDate(event.target.value)}
            inputProps={{ 'aria-label': locales.share_expiry, 'data-testid': 'share-edit-date', min: inDays(0) }}
            mb={0}
          />
          <FieldInput
            size='small'
            type='password'
            placeholder={share.hasPassword ? locales.share_password_change : locales.share_password_add}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            inputProps={{ 'aria-label': locales.share_password, 'data-testid': 'share-edit-password', maxLength: 72 }}
            mb={0}
          />
          {share.hasPassword && (
            <Button size='small' onClick={() => removePassword()} data-testid='share-edit-password-remove'>
              {locales.share_password_remove}
            </Button>
          )}
          <Button size='small' variant='contained' disabled={isPending} onClick={() => save()} data-testid='share-edit-save'>
            {locales.share_save}
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function ShareForm({ board }: { board: DashboardType }): JSX.Element {
  const queryClient = useQueryClient();
  const [, copy] = useCopyToClipboard();
  const [days, setDays] = useState(7);
  const [date, setDate] = useState('');
  const [password, setPassword] = useState('');
  // The link exists in full only now; the server keeps a hash, so it is shown here once.
  const [created, setCreated] = useState('');
  const { data } = useQuery({ queryKey: ['dashboard-shares', board.id], queryFn: () => api.dashboard.getShares(board.id) });

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => {
      const expiry = date || (days > 0 ? inDays(days) : '');

      return api.dashboard.createShare(board.id, {
        ...(expiry ? { expiresAt: endOfDay(expiry) } : {}),
        ...(password ? { password } : {})
      });
    },
    onSuccess: async (share) => {
      setCreated(`${window.location.origin}/share/${share.token}`);
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: ['dashboard-shares', board.id] });
    },
    onError: () => toast.error(locales.action_failed)
  });

  if (!data) return <Typography variant='body2'>…</Typography>;

  if (!data.available) {
    return (
      <Typography variant='body2' color='textSubdued' data-testid='share-unavailable'>
        {locales.share_unavailable}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ width: 560, maxWidth: '100%' }} data-testid='share-dialog'>
      <Typography variant='body2' color='textSubdued'>
        {locales.share_intro}
      </Typography>
      <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        {PRESETS.map((preset) => (
          <Chip
            key={preset.days}
            size='small'
            label={preset.label}
            color={!date && days === preset.days ? 'primary' : 'default'}
            onClick={() => {
              setDays(preset.days);
              setDate('');
            }}
            data-testid={`share-preset-${preset.days}`}
          />
        ))}
        <FieldInput
          size='small'
          type='date'
          value={date}
          onChange={(event) => setDate(event.target.value)}
          inputProps={{ 'aria-label': locales.share_expiry_date, 'data-testid': 'share-date', min: inDays(1) }}
          mb={0}
        />
      </Stack>
      <Stack direction='row' spacing={1}>
        <FieldInput
          size='small'
          type='password'
          placeholder={locales.share_password_optional}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          inputProps={{ 'aria-label': locales.share_password, 'data-testid': 'share-password', maxLength: 72 }}
          mb={0}
          sx={{ flex: 1 }}
        />
        <Button size='small' variant='contained' disabled={isPending} onClick={() => create()} data-testid='share-create'>
          {locales.share_create}
        </Button>
      </Stack>
      {created && (
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }} data-testid='share-created'>
          <FieldInput
            size='small'
            value={created}
            readOnly
            inputProps={{ 'aria-label': locales.share_link, 'data-testid': 'share-link' }}
            mb={0}
            sx={{ flex: 1 }}
          />
          <Button
            size='small'
            onClick={() => void copy(created).then((ok) => ok && toast.success(locales.copied))}
            data-testid='share-copy'
          >
            {locales.copy}
          </Button>
        </Stack>
      )}
      {created && (
        <Typography variant='caption' color='textSubdued'>
          {locales.share_shown_once}
        </Typography>
      )}
      {data.items.map((share) => (
        <ShareRow key={share.id} boardId={board.id} share={share} />
      ))}
    </Stack>
  );
}

/** Links that show a board read-only to people without an account: make one, set its expiry and password, revoke it. */
export default function ShareDialog({
  board,
  open,
  onClose
}: {
  board: DashboardType;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  return (
    <Modal open={open} onClose={onClose} title={locales.share_title}>
      {/* Remounts per open so a link shown once is not kept around. */}
      {open && <ShareForm board={board} />}
    </Modal>
  );
}
