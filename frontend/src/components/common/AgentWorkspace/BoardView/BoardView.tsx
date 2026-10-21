import api from '@/api';
import type { DashboardCardType, DashboardType } from '@/api/dashboard/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import ChartView from '@/components/common/ChartView/ChartView';
import locales from '@/locales';
import { Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';

function BoardCard({ board, card }: { board: DashboardType; card: DashboardCardType }): JSX.Element {
  const queryClient = useQueryClient();
  const { data, error, isFetching } = useQuery({
    queryKey: ['question-run', card.question.id],
    queryFn: () => api.question.runQuestion(card.question.id),
    // Opening a board shows fresh numbers.
    refetchOnMount: true
  });
  const setBoard = (next: DashboardType): void => {
    queryClient.setQueryData<DashboardType[]>(['dashboards', board.connectionId], (boards) =>
      boards?.map((item) => (item.id === next.id ? next : item))
    );
  };
  const { mutate: resize } = useMutation({
    mutationFn: () => api.dashboard.resizeCard(board.id, card.id, card.width === 2 ? 1 : 2),
    onSuccess: setBoard
  });
  const { mutate: unpin } = useMutation({
    mutationFn: () => api.dashboard.unpinCard(board.id, card.id),
    onSuccess: setBoard
  });

  return (
    <Box
      data-testid='ai-board-card'
      data-width={card.width}
      sx={{
        gridColumn: card.width === 2 ? 'span 2' : 'span 1',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        minWidth: 0
      }}
    >
      <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Typography variant='subtitle2' noWrap sx={{ flex: 1, minWidth: 0 }}>
          {card.question.name}
        </Typography>
        {isFetching && <CircularProgress size={12} />}
        <Tooltip title={card.width === 2 ? locales.ai_board_narrow : locales.ai_board_wide}>
          <IconButton size='small' onClick={() => resize()} data-testid='ai-board-card-resize'>
            <CustomIcon type={card.width === 2 ? 'collapse' : 'expand'} size='xs' />
          </IconButton>
        </Tooltip>
        <Tooltip title={locales.ai_board_unpin}>
          <IconButton size='small' onClick={() => unpin()} data-testid='ai-board-card-unpin'>
            <CustomIcon type='close' size='xs' />
          </IconButton>
        </Tooltip>
      </Stack>
      {error ? (
        <Typography variant='caption' color='error' data-testid='ai-board-card-error'>
          {error.message}
        </Typography>
      ) : data ? (
        <ChartView
          rows={data.rows}
          columns={data.columns?.map((column) => column.name) ?? Object.keys(data.rows[0] ?? {})}
          spec={card.question.chart}
          height={200}
        />
      ) : (
        <CircularProgress size={16} />
      )}
    </Box>
  );
}

/** A board on the canvas: its reports in a two-column grid, each run on open and on Refresh all. */
export default function BoardView({ board }: { board: DashboardType }): JSX.Element {
  const queryClient = useQueryClient();

  return (
    <Stack spacing={1} data-testid='ai-board' data-board={board.name}>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant='subtitle1' sx={{ fontWeight: 600, flex: 1 }}>
          {board.name}
        </Typography>
        <Button
          size='small'
          startIcon={<CustomIcon type='refresh' size='xs' />}
          onClick={() => void queryClient.invalidateQueries({ queryKey: ['question-run'], refetchType: 'all' })}
          data-testid='ai-board-refresh'
        >
          {locales.ai_board_refresh}
        </Button>
      </Stack>
      {board.cards.length === 0 ? (
        <Typography variant='body2' color='textSubdued'>
          {locales.ai_boards_empty}
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
          {board.cards.map((card) => (
            <BoardCard key={card.id} board={board} card={card} />
          ))}
        </Box>
      )}
    </Stack>
  );
}
