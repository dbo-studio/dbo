import api from '@/api';
import type { DashboardCardType, DashboardType } from '@/api/dashboard/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import ChartView from '@/components/common/ChartView/ChartView';
import { missingParams, questionParams } from '@/core/charts/chartSpec';
import { toCsv } from '@/core/utils/csv';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { Box, CircularProgress, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toPng } from 'html-to-image';
import { useRef, type JSX } from 'react';
import { useSetBoard } from '../useSetBoard';
import { BoardCardHeadStyled, BoardCardRootStyled } from './BoardCard.styled';

/** How long a card's result is reused before opening the board runs it again. */
const RESULT_TTL_MS = 5 * 60_000;

export default function BoardCard({
  board,
  card,
  editing,
  filters,
  refreshMs
}: {
  board: DashboardType;
  card: DashboardCardType;
  editing: boolean;
  filters: Record<string, string>;
  refreshMs: number;
}): JSX.Element {
  const theme = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  // A filter reaches each card whose SQL has a {{param}} of the same name.
  const declared = questionParams(card.question.sql);
  const params = Object.fromEntries(declared.map((param) => [param.name, filters[param.name] ?? '']));
  // Without every value the server would only refuse, so the card waits for the filters instead.
  const missing = missingParams(declared, params);
  const setBoard = useSetBoard(board.connectionId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !editing
  });
  const { data, error, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['question-run', card.question.id, params],
    queryFn: () => api.question.runQuestion(card.question.id, params),
    enabled: missing.length === 0,
    staleTime: RESULT_TTL_MS,
    // React Query skips interval runs while the window is hidden.
    refetchInterval: refreshMs || false
  });
  const columns = data ? (data.columns?.map((column) => column.name) ?? Object.keys(data.rows[0] ?? {})) : [];
  const exportPng = async (): Promise<void> => {
    if (!chartRef.current) return;
    const link = document.createElement('a');
    link.href = await toPng(chartRef.current, { backgroundColor: theme.palette.background.paper });
    link.download = `${card.question.name}.png`;
    link.click();
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
    <BoardCardRootStyled
      ref={setNodeRef}
      data-testid='ai-board-card'
      data-width={card.width}
      data-card={card.question.name}
      editing={editing}
      wide={card.width === 2}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <BoardCardHeadStyled>
        {editing && (
          <IconButton
            aria-label={locales.dashboard_card_move}
            sx={{ cursor: 'grab', touchAction: 'none' }}
            data-testid='ai-board-card-drag'
            {...attributes}
            {...listeners}
          >
            <CustomIcon type='grid' size='xs' />
          </IconButton>
        )}
        <Typography variant='subtitle2' noWrap sx={{ flex: 1, minWidth: 0 }}>
          {card.question.name}
        </Typography>
        {isFetching && <CircularProgress size={12} />}
        {data && !editing && (
          <>
            <Typography variant='caption' color='textSubdued' data-testid='ai-board-card-updated'>
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Tooltip title={locales.dashboard_card_csv}>
              <IconButton
                onClick={() =>
                  tools.fileDownload(
                    new Blob([toCsv(columns, data.rows)], { type: 'text/csv' }),
                    `${card.question.name}.csv`
                  )
                }
                data-testid='ai-board-card-csv'
              >
                <CustomIcon type='sheet' size='xs' />
              </IconButton>
            </Tooltip>
            <Tooltip title={locales.dashboard_card_png}>
              <IconButton onClick={() => void exportPng()} data-testid='ai-board-card-png'>
                <CustomIcon type='download' size='xs' />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={locales.dashboard_card_refresh}>
          <IconButton onClick={() => void refetch()} data-testid='ai-board-card-refresh'>
            <CustomIcon type='refresh' size='xs' />
          </IconButton>
        </Tooltip>
        {editing && (
          <>
            <Tooltip title={card.width === 2 ? locales.ai_board_narrow : locales.ai_board_wide}>
              <IconButton onClick={() => resize()} data-testid='ai-board-card-resize'>
                <CustomIcon type={card.width === 2 ? 'collapse' : 'expand'} size='xs' />
              </IconButton>
            </Tooltip>
            <Tooltip title={locales.ai_board_unpin}>
              <IconButton onClick={() => unpin()} data-testid='ai-board-card-unpin'>
                <CustomIcon type='close' size='xs' />
              </IconButton>
            </Tooltip>
          </>
        )}
      </BoardCardHeadStyled>
      {missing.length > 0 ? (
        <Typography variant='caption' color='textSubdued' data-testid='ai-board-card-needs-filter'>
          {locales.dashboard_filter_needed.replace('{names}', missing.join(', '))}
        </Typography>
      ) : error ? (
        <Typography variant='caption' color='error' data-testid='ai-board-card-error'>
          {error.message}
        </Typography>
      ) : data ? (
        <Box ref={chartRef}>
          <ChartView rows={data.rows} columns={columns} spec={card.question.chart} height={200} />
        </Box>
      ) : (
        <CircularProgress size={16} />
      )}
    </BoardCardRootStyled>
  );
}