import api from '@/api';
import type { DashboardShareType } from '@/api/dashboard/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { Button, Chip, IconButton, InputBase, Switch, Tooltip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';
import Field from '../Field/Field';
import { endOfDay, inDays, shareStatus, toDateInput } from '../shareUtils';
import {
  ShareEditActionsStyled,
  ShareFieldGrowStyled,
  ShareRowEditStyled,
  ShareRowHeaderStyled,
  ShareRowMainStyled,
  ShareRowRootStyled,
  ShareRowTitleStyled,
  ShareStatusDotStyled,
  ShareVisitsStyled
} from './ShareRow.styled';

export default function ShareRow({ boardId, share }: { boardId: number; share: DashboardShareType }): JSX.Element {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(() => toDateInput(share.expiresAt));
  const [password, setPassword] = useState('');
  const [showVisits, setShowVisits] = useState(false);
  const state = shareStatus(share);
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
    <ShareRowRootStyled data-testid='share-row' data-status={state}>
      <ShareRowHeaderStyled>
        <ShareStatusDotStyled aria-label={locales[`share_status_${state}`]} status={state} />
        <ShareRowMainStyled>
          <ShareRowTitleStyled>
            <Typography variant='body2' noWrap color={state === 'active' ? 'textText' : 'textSubdued'}>
              {share.expiresAt
                ? locales.share_expires_on.replace('{date}', new Date(share.expiresAt).toLocaleDateString())
                : locales.share_expiry_never}
            </Typography>
            {share.hasPassword && (
              <Chip variant='outlined' icon={<CustomIcon type='lock' size='xs' />} label={locales.share_password_set} />
            )}
            {share.allowFilters && <Chip variant='outlined' label={locales.share_filters_on} />}
            {state !== 'active' && <Chip label={locales[`share_status_${state}`]} />}
          </ShareRowTitleStyled>
          <Typography variant='caption' color='textSubdued' noWrap component='div'>
            {details.join(' · ')}
          </Typography>
        </ShareRowMainStyled>
        <Tooltip title={locales.share_activity}>
          <IconButton
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
              <IconButton aria-label={locales.share_revoke} onClick={() => revoke()} data-testid='share-revoke'>
                <CustomIcon type='stop' size='s' />
              </IconButton>
            </Tooltip>
          </>
        )}
      </ShareRowHeaderStyled>
      {showVisits && (
        <ShareVisitsStyled data-testid='share-visits'>
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
        </ShareVisitsStyled>
      )}
      {editing && state !== 'revoked' && (
        <ShareRowEditStyled>
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
            <InputBase
              type='date'
              value={date}
              onChange={(event) => setDate(event.target.value)}
              inputProps={{ 'aria-label': locales.share_expiry, 'data-testid': 'share-edit-date', min: inDays(0) }}
            />
          </Field>
          <Field label={locales.share_password}>
            <ShareFieldGrowStyled>
              <FieldInput
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
            </ShareFieldGrowStyled>
          </Field>
          <ShareEditActionsStyled>
            {share.hasPassword && (
              <Button color='error' onClick={() => removePassword()} data-testid='share-edit-password-remove'>
                {locales.share_password_remove}
              </Button>
            )}
            <Button variant='contained' disabled={isPending} onClick={() => save()} data-testid='share-edit-save'>
              {locales.share_save}
            </Button>
          </ShareEditActionsStyled>
        </ShareRowEditStyled>
      )}
    </ShareRowRootStyled>
  );
}