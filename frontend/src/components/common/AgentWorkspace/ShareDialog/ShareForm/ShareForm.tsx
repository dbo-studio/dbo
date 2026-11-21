import Segmented from '@/components/base/Segmented/Segmented';
import api from '@/api';
import type { DashboardType } from '@/api/dashboard/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { Button, CircularProgress, InputBase, Switch, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import Field from '../Field/Field';
import Section from '../Section/Section';
import ShareRow from '../ShareRow/ShareRow';
import { CUSTOM, PRESETS, endOfDay, inDays } from '../shareUtils';
import {
  ShareCreatedRowStyled,
  ShareCreatedStyled,
  ShareFieldGrowStyled,
  ShareFormBodyStyled,
  ShareLinkGrowStyled,
  ShareListStyled,
  ShareLoadingStyled
} from './ShareForm.styled';

export default function ShareForm({ board, onClose }: { board: DashboardType; onClose: () => void }): JSX.Element {
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
          <Button onClick={onClose}>{locales.close}</Button>
          {available && (
            <Button
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
        <ShareLoadingStyled>
          <CircularProgress size={20} />
        </ShareLoadingStyled>
      ) : !available ? (
        <Typography variant='body2' color='textSubdued' data-testid='share-unavailable'>
          {locales.share_unavailable}
        </Typography>
      ) : (
        <ShareFormBodyStyled data-testid='share-dialog'>
          <Typography variant='caption' color='textSubdued'>
            {locales.share_intro}
          </Typography>

          <Section title={locales.share_new_link}>
            <Field label={locales.share_expiry}>
              <Segmented
                value={days}
                onChange={setDays}
                options={[
                  ...PRESETS.map((preset) => ({
                    value: preset.days,
                    label: preset.label,
                    testId: `share-preset-${preset.days}`
                  })),
                  { value: CUSTOM, label: locales.share_expiry_custom, testId: 'share-preset-custom' }
                ]}
              />
            </Field>
            {days === CUSTOM && (
              <Field label=''>
                <InputBase
                  type='date'
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  inputProps={{ 'aria-label': locales.share_expiry_date, 'data-testid': 'share-date', min: inDays(1) }}
                />
              </Field>
            )}
            <Field label={locales.share_password}>
              <ShareFieldGrowStyled>
                <FieldInput
                  type='password'
                  placeholder={locales.share_optional}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  inputProps={{ 'aria-label': locales.share_password, 'data-testid': 'share-password', maxLength: 72 }}
                  mb={0}
                />
              </ShareFieldGrowStyled>
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
            <ShareCreatedStyled data-testid='share-created'>
              <ShareCreatedRowStyled>
                <CustomIcon type='link' size='s' />
                <ShareLinkGrowStyled>
                  <InputBase
                    value={created}
                    readOnly
                    inputProps={{ 'aria-label': locales.share_link, 'data-testid': 'share-link' }}
                  />
                </ShareLinkGrowStyled>
                <Button
                  variant='outlined'
                  startIcon={<CustomIcon type='copy' size='xs' color='currentColor' />}
                  onClick={() => void copy(created).then((ok) => ok && toast.success(locales.copied))}
                  data-testid='share-copy'
                >
                  {locales.copy}
                </Button>
              </ShareCreatedRowStyled>
              <Typography variant='caption' color='textSubdued'>
                {locales.share_shown_once}
              </Typography>
            </ShareCreatedStyled>
          )}

          <Section title={`${locales.share_links} · ${data.items.length}`}>
            {data.items.length === 0 ? (
              <Typography variant='caption' color='textSubdued'>
                {locales.share_links_empty}
              </Typography>
            ) : (
              <ShareListStyled>
                {data.items.map((share) => (
                  <ShareRow key={share.id} boardId={board.id} share={share} />
                ))}
              </ShareListStyled>
            )}
          </Section>
        </ShareFormBodyStyled>
      )}
    </Modal>
  );
}
