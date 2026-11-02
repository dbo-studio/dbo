import api from '@/api';
import type { DashboardShareType, DashboardType } from '@/api/dashboard/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const CUSTOM = -1;
const PRESETS = [
  { label: locales.share_expiry_1d, days: 1 },
  { label: locales.share_expiry_7d, days: 7 },
  { label: locales.share_expiry_30d, days: 30 },
  { label: locales.share_expiry_never, days: 0 }
];
const STATUS_COLOR = { active: 'success.main', expired: 'warning.main', revoked: 'text.disabled' } as const;

/** The end of the picked day in the user's time zone, as the server wants it. */
const endOfDay = (date: string): string => new Date(`${date}T23:59:59`).toISOString();
const toDateInput = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('sv') : '');
const inDays = (days: number): string => new Date(Date.now() + days * DAY_MS).toLocaleDateString('sv');

const status = (share: DashboardShareType): 'revoked' | 'expired' | 'active' =>
  share.revoked ? 'revoked' : share.expiresAt && new Date(share.expiresAt) <= new Date() ? 'expired' : 'active';

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
      <Typography variant='caption' color='textText' sx={{ width: 96, flexShrink: 0 }}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <Stack spacing={1}>
      <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function ShareRow({ boardId, share }: { boardId: number; share: DashboardShareType }): JSX.Element {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(() => toDateInput(share.expiresAt));
  const [password, setPassword] = useState('');
  const [showVisits, setShowVisits] = useState(false);
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
  const { mutate: setFilters } = useMutation({
    mutationFn: (allow: boolean) => api.dashboard.updateShare(boardId, share.id, { allowFilters: allow }),
    onSuccess: refresh,
    onError: () => toast.error(locales.action_failed)
  });
  const { data: visits } = useQuery({
    queryKey: ['dashboard-share-visits', boardId, share.id, share.viewCount],
    queryFn: () => api.dashboard.getShareVisits(boardId, share.id),
    enabled: showVisits
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

  const details = [
    locales.share_created_on.replace('{date}', new Date(share.createdAt).toLocaleDateString()),
    locales.share_views.replace('{count}', String(share.viewCount)),
    share.lastViewedAt && locales.share_last_viewed.replace('{date}', new Date(share.lastViewedAt).toLocaleString())
  ].filter(Boolean);

  return (
    <Box sx={{ px: 1.5, py: 1 }} data-testid='share-row' data-status={state}>
      <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          aria-label={locales[`share_status_${state}`]}
          sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: STATUS_COLOR[state] }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant='body2' noWrap color={state === 'active' ? 'textText' : 'textSubdued'}>
              {share.expiresAt
                ? locales.share_expires_on.replace('{date}', new Date(share.expiresAt).toLocaleDateString())
                : locales.share_expiry_never}
            </Typography>
            {share.hasPassword && (
              <Chip
                size='small'
                variant='outlined'
                icon={<CustomIcon type='lock' size='xs' />}
                label={locales.share_password_set}
              />
            )}
            {share.allowFilters && <Chip size='small' variant='outlined' label={locales.share_filters_on} />}
            {state !== 'active' && <Chip size='small' label={locales[`share_status_${state}`]} />}
          </Stack>
          <Typography variant='caption' color='textSubdued' noWrap component='div'>
            {details.join(' · ')}
          </Typography>
        </Box>
        <Tooltip title={locales.share_activity}>
          <IconButton
            size='small'
            aria-label={locales.share_activity}
            aria-pressed={showVisits}
            color={showVisits ? 'primary' : 'default'}
            onClick={() => setShowVisits(!showVisits)}
            data-testid='share-visits-toggle'
          >
            <CustomIcon type='history' size='s' />
          </IconButton>
        </Tooltip>
        {state !== 'revoked' && (
          <>
            <Tooltip title={locales.share_edit}>
              <IconButton
                size='small'
                aria-label={locales.share_edit}
                aria-pressed={editing}
                color={editing ? 'primary' : 'default'}
                onClick={() => setEditing(!editing)}
                data-testid='share-edit'
              >
                <CustomIcon type='pen' size='s' />
              </IconButton>
            </Tooltip>
            <Tooltip title={locales.share_revoke}>
              <IconButton
                size='small'
                aria-label={locales.share_revoke}
                onClick={() => revoke()}
                data-testid='share-revoke'
              >
                <CustomIcon type='stop' size='s' />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
      {showVisits && (
        <Stack spacing={0.25} sx={{ mt: 1, pl: 2.5 }} data-testid='share-visits'>
          {(visits ?? []).length === 0 && (
            <Typography variant='caption' color='textSubdued'>
              {locales.share_no_visits}
            </Typography>
          )}
          {(visits ?? []).map((visit) => (
            <Typography
              key={`${visit.viewedAt}-${visit.outcome}-${visit.ip}`}
              variant='caption'
              color='textSubdued'
              data-testid='share-visit'
              data-outcome={visit.outcome}
            >
              {new Date(visit.viewedAt).toLocaleString()} · {locales[`share_visit_${visit.outcome}`]}
              {visit.ip && ` · ${visit.ip}`}
            </Typography>
          ))}
        </Stack>
      )}
      {editing && state !== 'revoked' && (
        <Stack spacing={1} sx={{ mt: 1, pl: 2.5 }}>
          <Field label={locales.share_allow_filters}>
            <Switch
              size='small'
              checked={share.allowFilters}
              onChange={(event) => setFilters(event.target.checked)}
              slotProps={{
                input: {
                  'aria-label': locales.share_allow_filters,
                  'data-testid': 'share-edit-filters'
                } as React.InputHTMLAttributes<HTMLInputElement>
              }}
            />
          </Field>
          <Field label={locales.share_expiry}>
            <FieldInput
              size='small'
              type='date'
              value={date}
              onChange={(event) => setDate(event.target.value)}
              inputProps={{ 'aria-label': locales.share_expiry, 'data-testid': 'share-edit-date', min: inDays(0) }}
              mb={0}
            />
          </Field>
          <Field label={locales.share_password}>
            <Box sx={{ flex: 1 }}>
              <FieldInput
                size='small'
                type='password'
                placeholder={share.hasPassword ? locales.share_password_change : locales.share_password_add}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                inputProps={{
                  'aria-label': locales.share_password,
                  'data-testid': 'share-edit-password',
                  maxLength: 72
                }}
                mb={0}
              />
            </Box>
          </Field>
          <Stack direction='row' spacing={1} sx={{ justifyContent: 'flex-end' }}>
            {share.hasPassword && (
              <Button
                size='small'
                color='error'
                onClick={() => removePassword()}
                data-testid='share-edit-password-remove'
              >
                {locales.share_password_remove}
              </Button>
            )}
            <Button
              size='small'
              variant='contained'
              disabled={isPending}
              onClick={() => save()}
              data-testid='share-edit-save'
            >
              {locales.share_save}
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}

function ShareForm({ board, onClose }: { board: DashboardType; onClose: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const [, copy] = useCopyToClipboard();
  const [days, setDays] = useState(7);
  const [date, setDate] = useState('');
  const [password, setPassword] = useState('');
  // The link exists in full only now; the server keeps a hash, so it is shown here once.
  const [created, setCreated] = useState('');
  const [allowFilters, setAllowFilters] = useState(false);
  const { data } = useQuery({
    queryKey: ['dashboard-shares', board.id],
    queryFn: () => api.dashboard.getShares(board.id)
  });

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => {
      const expiry = days === CUSTOM ? date : days > 0 ? inDays(days) : '';

      return api.dashboard.createShare(board.id, {
        ...(expiry ? { expiresAt: endOfDay(expiry) } : {}),
        ...(password ? { password } : {}),
        ...(allowFilters ? { allowFilters } : {})
      });
    },
    onSuccess: async (share) => {
      setCreated(`${window.location.origin}/share/${share.token}`);
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: ['dashboard-shares', board.id] });
    },
    onError: () => toast.error(locales.action_failed)
  });

  const available = !!data?.available;

  return (
    <Modal
      open
      onClose={onClose}
      title={locales.share_title}
      footer={
        <>
          <Button size='small' onClick={onClose}>
            {locales.close}
          </Button>
          {available && (
            <Button
              size='small'
              variant='contained'
              disabled={isPending || (days === CUSTOM && !date)}
              onClick={() => create()}
              data-testid='share-create'
            >
              {locales.share_create}
            </Button>
          )}
        </>
      }
    >
      {!data ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
          <CircularProgress size={20} />
        </Box>
      ) : !available ? (
        <Typography variant='body2' color='textSubdued' data-testid='share-unavailable'>
          {locales.share_unavailable}
        </Typography>
      ) : (
        <Stack spacing={2.5} sx={{ width: 520, maxWidth: '100%' }} data-testid='share-dialog'>
          <Typography variant='caption' color='textSubdued'>
            {locales.share_intro}
          </Typography>

          <Section title={locales.share_new_link}>
            <Field label={locales.share_expiry}>
              <ToggleButtonGroup
                exclusive
                size='small'
                value={days}
                onChange={(_, picked: number | null) => picked !== null && setDays(picked)}
                sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1, textTransform: 'none' } }}
              >
                {PRESETS.map((preset) => (
                  <ToggleButton key={preset.days} value={preset.days} data-testid={`share-preset-${preset.days}`}>
                    {preset.label}
                  </ToggleButton>
                ))}
                <ToggleButton value={CUSTOM} data-testid='share-preset-custom'>
                  {locales.share_expiry_custom}
                </ToggleButton>
              </ToggleButtonGroup>
            </Field>
            {days === CUSTOM && (
              <Field label=''>
                <FieldInput
                  size='small'
                  type='date'
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  inputProps={{ 'aria-label': locales.share_expiry_date, 'data-testid': 'share-date', min: inDays(1) }}
                  mb={0}
                />
              </Field>
            )}
            <Field label={locales.share_password}>
              <Box sx={{ flex: 1 }}>
                <FieldInput
                  size='small'
                  type='password'
                  placeholder={locales.share_optional}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  inputProps={{ 'aria-label': locales.share_password, 'data-testid': 'share-password', maxLength: 72 }}
                  mb={0}
                />
              </Box>
            </Field>
            <Field label={locales.share_allow_filters}>
              <Switch
                size='small'
                checked={allowFilters}
                onChange={(event) => setAllowFilters(event.target.checked)}
                slotProps={{
                  input: {
                    'aria-label': locales.share_allow_filters,
                    'data-testid': 'share-allow-filters'
                  } as React.InputHTMLAttributes<HTMLInputElement>
                }}
              />
            </Field>
          </Section>

          {created && (
            <Stack
              spacing={1}
              sx={{ border: 1, borderColor: 'primary.main', borderRadius: 1, p: 1.5 }}
              data-testid='share-created'
            >
              <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                <CustomIcon type='link' size='s' />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <FieldInput
                    size='small'
                    value={created}
                    readOnly
                    inputProps={{ 'aria-label': locales.share_link, 'data-testid': 'share-link' }}
                    mb={0}
                  />
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<CustomIcon type='copy' size='xs' color='currentColor' />}
                  onClick={() => void copy(created).then((ok) => ok && toast.success(locales.copied))}
                  data-testid='share-copy'
                >
                  {locales.copy}
                </Button>
              </Stack>
              <Typography variant='caption' color='textSubdued'>
                {locales.share_shown_once}
              </Typography>
            </Stack>
          )}

          <Section title={`${locales.share_links} · ${data.items.length}`}>
            {data.items.length === 0 ? (
              <Typography variant='caption' color='textSubdued'>
                {locales.share_links_empty}
              </Typography>
            ) : (
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  '& > :not(:last-child)': { borderBottom: 1, borderColor: 'divider' }
                }}
              >
                {data.items.map((share) => (
                  <ShareRow key={share.id} boardId={board.id} share={share} />
                ))}
              </Box>
            )}
          </Section>
        </Stack>
      )}
    </Modal>
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
  // Remounts per open so a link shown once is not kept around.
  return <>{open && <ShareForm board={board} onClose={onClose} />}</>;
}
