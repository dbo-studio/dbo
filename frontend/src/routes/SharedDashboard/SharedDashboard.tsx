import api from '@/api';
import type { PublicCardType } from '@/api/dashboard/types';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import ChartView from '@/components/common/ChartView/ChartView';
import ParamInput from '@/components/common/AgentWorkspace/ParamInput/ParamInput';
import type { QuestionParam } from '@/core/charts/chartSpec';
import locales from '@/locales';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState, type JSX } from 'react';

const PASSWORD_KEY = (token: string): string => `share-password-${token}`;

function SharedCard({ card }: { card: PublicCardType }): JSX.Element {
  const rows = card.result?.rows ?? [];
  const columns = card.result?.columns?.map((column) => column.name) ?? Object.keys(rows[0] ?? {});

  return (
    <Box
      data-testid='shared-card'
      data-width={card.width}
      sx={{
        gridColumn: card.width === 2 ? 'span 2' : 'span 1',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        minWidth: 0,
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant='subtitle2' noWrap sx={{ mb: 0.5 }}>
        {card.name}
      </Typography>
      {card.error ? (
        <Typography variant='caption' color='error' data-testid='shared-card-error'>
          {card.error}
        </Typography>
      ) : (
        <ChartView rows={rows} columns={columns} spec={card.chart} height={220} />
      )}
    </Box>
  );
}

/** A dashboard opened from a share link: no sign-in, no editing, only what the link's owner chose to show. */
export default function SharedDashboard({ token }: { token: string }): JSX.Element {
  // The password lives for this tab only, so a reload does not ask again but a new tab does.
  const [password, setPassword] = useState(() => sessionStorage.getItem(PASSWORD_KEY(token)) ?? '');
  const [typed, setTyped] = useState('');
  // What the viewer has applied; the page starts from each report's saved values (none sent).
  const [applied, setApplied] = useState<Record<string, string> | undefined>(undefined);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['shared-dashboard', token, password, applied],
    queryFn: () => api.dashboard.viewSharedDashboard(token, password || undefined, applied),
    // Moving between filter values should not blank the page.
    placeholderData: (previous) => previous
  });
  const reason = axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
  const needsPassword = reason === 'share_password_required' || reason === 'share_password_invalid';

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (needsPassword) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }} data-testid='shared-password'>
        <Stack
          component='form'
          spacing={1.5}
          sx={{ width: 320 }}
          onSubmit={(event) => {
            event.preventDefault();
            sessionStorage.setItem(PASSWORD_KEY(token), typed);
            setPassword(typed);
          }}
        >
          <Typography variant='h6'>{locales.share_password_title}</Typography>
          <FieldInput
            autoFocus
            type='password'
            placeholder={locales.password}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            inputProps={{ 'aria-label': locales.password, 'data-testid': 'shared-password-input' }}
            mb={0}
          />
          {reason === 'share_password_invalid' && (
            <Typography variant='caption' color='error' data-testid='shared-password-error'>
              {locales.share_password_wrong}
            </Typography>
          )}
          <Button type='submit' variant='contained' disabled={!typed} data-testid='shared-password-submit'>
            {locales.share_open}
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!data) {
    return <EmptyState title={locales.share_not_available} description={locales.share_not_available_hint} />;
  }

  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }} data-testid='shared-dashboard'>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant='h6' sx={{ flex: 1 }} data-testid='shared-dashboard-name'>
          {data.name}
        </Typography>
        <Typography variant='caption' color='textSubdued'>
          {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Typography>
        <Button disabled={isFetching} onClick={() => void refetch()} data-testid='shared-refresh'>
          {locales.dashboard_card_refresh}
        </Button>
      </Stack>
      {data.filters.length > 0 && (
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }} data-testid='shared-filters'>
          {data.filters.map((filter) => (
            <ParamInput
              key={filter.name}
              param={{ name: filter.name, type: filter.type === 'text' ? '' : (filter.type as QuestionParam['type']) }}
              value={draft[filter.name] ?? applied?.[filter.name] ?? filter.value}
              onChange={(value) => setDraft((current) => ({ ...current, [filter.name]: value }))}
              onCommit={(value) =>
                setApplied((current) => ({
                  ...Object.fromEntries(data.filters.map((item) => [item.name, current?.[item.name] ?? item.value])),
                  [filter.name]: value
                }))
              }
              connectionId={0}
              lookup={false}
            />
          ))}
        </Stack>
      )}
      {data.cards.length === 0 ? (
        <Typography variant='body2' color='textSubdued'>
          {locales.ai_boards_empty}
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
          {data.cards.map((card) => (
            <SharedCard key={card.id} card={card} />
          ))}
        </Box>
      )}
    </Box>
  );
}
