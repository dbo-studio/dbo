import api from '@/api';
import type { DashboardCardType, DashboardType } from '@/api/dashboard/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import ChartView from '@/components/common/ChartView/ChartView';
import { missingParams, questionParams, type QuestionParam } from '@/core/charts/chartSpec';
import ParamInput from '../ParamInput/ParamInput';
import locales from '@/locales';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toCsv } from '@/core/utils/csv';
import { tools } from '@/core/utils';
import { toPng } from 'html-to-image';
import { useRef, useState, type JSX } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import ScheduleDialog from '../ScheduleDialog/ScheduleDialog';
import ShareDialog from '../ShareDialog/ShareDialog';
import { exportBoard } from './boardJson';

/** How long a card's result is reused before opening the board runs it again. */
const RESULT_TTL_MS = 5 * 60_000;
const REFRESH_OPTIONS: SelectInputOption[] = [
  { value: 0, label: locales.dashboard_refresh_off },
  { value: 60_000, label: locales.dashboard_refresh_1m },
  { value: 5 * 60_000, label: locales.dashboard_refresh_5m },
  { value: 15 * 60_000, label: locales.dashboard_refresh_15m }
];

/** Writes a board the server returned into the cached list, so every view of it updates. */
const useSetBoard = (connectionId: number): ((next: DashboardType) => void) => {
  const queryClient = useQueryClient();

  return (next) =>
    queryClient.setQueryData<DashboardType[]>(['dashboards', connectionId], (boards) =>
      boards?.map((item) => (item.id === next.id ? next : item))
    );
};

function BoardCard({
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
    <Box
      ref={setNodeRef}
      data-testid='ai-board-card'
      data-width={card.width}
      data-card={card.question.name}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      sx={{
        gridColumn: card.width === 2 ? 'span 2' : 'span 1',
        border: 1,
        borderColor: editing ? 'primary.main' : 'divider',
        borderStyle: editing ? 'dashed' : 'solid',
        borderRadius: 1,
        p: 1,
        minWidth: 0,
        bgcolor: 'background.paper'
      }}
    >
      <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
        {editing && (
          <IconButton
            size='small'
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
                size='small'
                onClick={() =>
                  tools.fileDownload(new Blob([toCsv(columns, data.rows)], { type: 'text/csv' }), `${card.question.name}.csv`)
                }
                data-testid='ai-board-card-csv'
              >
                <CustomIcon type='sheet' size='xs' />
              </IconButton>
            </Tooltip>
            <Tooltip title={locales.dashboard_card_png}>
              <IconButton size='small' onClick={() => void exportPng()} data-testid='ai-board-card-png'>
                <CustomIcon type='download' size='xs' />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={locales.dashboard_card_refresh}>
          <IconButton size='small' onClick={() => void refetch()} data-testid='ai-board-card-refresh'>
            <CustomIcon type='refresh' size='xs' />
          </IconButton>
        </Tooltip>
        {editing && (
          <>
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
          </>
        )}
      </Stack>
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
    </Box>
  );
}

/** Picks a saved report that is not on the board yet and adds it as a card. */
function AddCard({ board }: { board: DashboardType }): JSX.Element {
  const setBoard = useSetBoard(board.connectionId);
  const { data: questions } = useQuery({
    queryKey: ['questions', board.connectionId],
    queryFn: () => api.question.getQuestions(board.connectionId)
  });
  const { mutate: pin } = useMutation({
    mutationFn: (questionId: number) => api.dashboard.pinToDashboard(board.id, questionId),
    onSuccess: setBoard
  });
  const onBoard = new Set(board.cards.map((card) => card.question.id));
  const options = (questions ?? [])
    .filter((question) => !onBoard.has(question.id))
    .map((question): SelectInputOption => ({ value: question.id, label: question.name }));

  return (
    <Box sx={{ width: 260 }}>
      <SelectInput
        testId='dashboard-add-card'
        emptylabel={locales.dashboard_add_card}
        value=''
        options={options}
        onChange={(value) => pin((value as SelectInputOption).value as number)}
      />
    </Box>
  );
}

/** A board: its reports in a two-column grid, run on open and on Refresh all; Edit arranges the cards. */
export default function BoardView({ board }: { board: DashboardType }): JSX.Element {
  const queryClient = useQueryClient();
  const setBoard = useSetBoard(board.connectionId);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [refreshMs, setRefreshMs] = useLocalStorage(`dashboard-refresh-${board.id}`, 0);
  // Typed values are applied on Enter or blur, so cards do not rerun on every key.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  // One widget per filter name; the first card that declares it sets its type, any card's saved default fills it.
  const filterParams = [
    ...new Map(
      board.cards
        .flatMap((card) => questionParams(card.question.sql))
        .reverse()
        .map((param): [string, QuestionParam] => [param.name, param])
    ).values()
  ].reverse();
  const defaults = board.cards.reduce<Record<string, string>>((all, card) => ({ ...all, ...card.question.params }), {});
  const filters = { ...defaults, ...applied };
  const shown = { ...filters, ...draft };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const { mutate: reorder } = useMutation({
    mutationFn: (cards: DashboardCardType[]) =>
      api.dashboard.reorderCards(
        board.id,
        cards.map((card) => card.id)
      ),
    // Show the new order at once; the server's answer replaces it, a failure puts the old one back.
    onMutate: (cards) => setBoard({ ...board, cards }),
    onSuccess: setBoard,
    onError: () => setBoard(board)
  });

  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return;
    const ids = board.cards.map((card) => card.id);
    reorder(arrayMove(board.cards, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))));
  };

  return (
    <Stack spacing={1} data-testid='ai-board' data-board={board.name} data-editing={editing}>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant='subtitle1' sx={{ fontWeight: 600, flex: 1 }}>
          {board.name}
        </Typography>
        {editing && <AddCard board={board} />}
        <Button
          size='small'
          startIcon={<CustomIcon type='refresh' size='xs' />}
          onClick={() => void queryClient.invalidateQueries({ queryKey: ['question-run'], refetchType: 'all' })}
          data-testid='ai-board-refresh'
        >
          {locales.ai_board_refresh}
        </Button>
        <Box sx={{ width: 120 }}>
          <SelectInput
            testId='dashboard-auto-refresh'
            value={refreshMs as unknown as string}
            options={REFRESH_OPTIONS}
            onChange={(picked) => setRefreshMs((picked as SelectInputOption).value as number)}
          />
        </Box>
        <Button size='small' onClick={() => setSharing(true)} data-testid='dashboard-share'>
          {locales.share_title}
        </Button>
        <ShareDialog board={board} open={sharing} onClose={() => setSharing(false)} />
        <Button size='small' onClick={() => setScheduling(true)} data-testid='dashboard-schedule'>
          {locales.schedule_title}
        </Button>
        <ScheduleDialog board={board} open={scheduling} onClose={() => setScheduling(false)} />
        <Tooltip title={locales.dashboard_export}>
          <IconButton size='small' onClick={() => exportBoard(board)} data-testid='dashboard-export'>
            <CustomIcon type='export' size='xs' />
          </IconButton>
        </Tooltip>
        <Button
          size='small'
          variant={editing ? 'contained' : 'text'}
          startIcon={<CustomIcon type={editing ? 'check' : 'pen'} size='xs' />}
          onClick={() => setEditing(!editing)}
          data-testid='dashboard-edit'
        >
          {editing ? locales.dashboard_done : locales.dashboard_edit}
        </Button>
      </Stack>
      {filterParams.length > 0 && (
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }} data-testid='dashboard-filters'>
          {filterParams.map((param) => (
            <ParamInput
              key={param.name}
              param={param}
              value={shown[param.name] ?? ''}
              onChange={(value) => setDraft((current) => ({ ...current, [param.name]: value }))}
              onCommit={(value) => setApplied((current) => ({ ...current, [param.name]: value }))}
              connectionId={board.connectionId}
              scope={{ database: board.cards[0]?.question.database, schema: board.cards[0]?.question.schema }}
            />
          ))}
        </Stack>
      )}
      {board.cards.length === 0 ? (
        <Typography variant='body2' color='textSubdued'>
          {locales.ai_boards_empty}
        </Typography>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={board.cards.map((card) => card.id)} strategy={rectSortingStrategy}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
              {board.cards.map((card) => (
                <BoardCard key={card.id} board={board} card={card} editing={editing} filters={filters} refreshMs={refreshMs} />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}
    </Stack>
  );
}
