import { useCan } from '@/hooks/useFeaturePermissions';
import { PERM } from '@/core/auth/permissions';
import api from '@/api';
import type { DashboardCardType, DashboardType } from '@/api/dashboard/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { questionParams, type QuestionParam } from '@/core/charts/chartSpec';
import locales from '@/locales';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { ToolbarSpacerStyled, ToolbarStyled } from '@/components/base/Toolbar/Toolbar.styled';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import ScheduleDialog from '../ScheduleDialog/ScheduleDialog';
import ShareDialog from '../ShareDialog/ShareDialog';
import ParamInput from '../ParamInput/ParamInput';
import { exportBoard } from './boardJson';
import AddCard from './AddCard/AddCard';
import BoardCard from './BoardCard/BoardCard';
import { BoardCanvasStyled, BoardFiltersStyled, BoardGridStyled, BoardRootStyled } from './BoardView.styled';
import { useSetBoard } from './useSetBoard';

const REFRESH_OPTIONS: SelectInputOption[] = [
  { value: 0, label: locales.dashboard_refresh_off },
  { value: 60_000, label: locales.dashboard_refresh_1m },
  { value: 5 * 60_000, label: locales.dashboard_refresh_5m },
  { value: 15 * 60_000, label: locales.dashboard_refresh_15m }
];

/** A board: its reports in a two-column grid, run on open and on Refresh all; Edit arranges the cards. */
export default function BoardView({ board }: { board: DashboardType }): JSX.Element {
  const queryClient = useQueryClient();
  const setBoard = useSetBoard(board.connectionId);
  const [editing, setEditing] = useState(false);
  const can = useCan();
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
    <BoardRootStyled data-testid='ai-board' data-board={board.name} data-editing={editing}>
      <ToolbarStyled>
        <SelectInput
          testId='dashboard-auto-refresh'
          value={refreshMs as unknown as string}
          options={REFRESH_OPTIONS}
          onChange={(picked) => setRefreshMs((picked as SelectInputOption).value as number)}
        />
        {editing && <AddCard board={board} />}
        <ToolbarSpacerStyled />
        <Stack direction='row' spacing={2}>
          <Tooltip title={locales.ai_board_refresh}>
            <IconButton
              aria-label={locales.ai_board_refresh}
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['question-run'], refetchType: 'all' })}
              data-testid='ai-board-refresh'
            >
              <CustomIcon type='refresh' />
            </IconButton>
          </Tooltip>
          {can(PERM.boardsShare) && (
            <Tooltip title={locales.share_title}>
              <IconButton
                aria-label={locales.share_title}
                onClick={() => setSharing(true)}
                data-testid='dashboard-share'
              >
                <CustomIcon type='share' />
              </IconButton>
            </Tooltip>
          )}
          {can(PERM.boardsShare) && (
            <Tooltip title={locales.schedule_title}>
              <IconButton
                aria-label={locales.schedule_title}
                onClick={() => setScheduling(true)}
                data-testid='dashboard-schedule'
              >
                <CustomIcon type='clock' />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={locales.dashboard_export}>
            <IconButton
              aria-label={locales.dashboard_export}
              onClick={() => exportBoard(board)}
              data-testid='dashboard-export'
            >
              <CustomIcon type='export' />
            </IconButton>
          </Tooltip>
          <Tooltip title={editing ? locales.dashboard_done : locales.dashboard_edit}>
            <IconButton
              aria-label={editing ? locales.dashboard_done : locales.dashboard_edit}
              aria-pressed={editing}
              color={editing ? 'primary' : 'default'}
              onClick={() => setEditing(!editing)}
              data-testid='dashboard-edit'
            >
              <CustomIcon type={editing ? 'check' : 'pen'} />
            </IconButton>
          </Tooltip>
        </Stack>
        <ShareDialog board={board} open={sharing} onClose={() => setSharing(false)} />
        <ScheduleDialog board={board} open={scheduling} onClose={() => setScheduling(false)} />
      </ToolbarStyled>
      <BoardCanvasStyled>
        {filterParams.length > 0 && (
          <BoardFiltersStyled data-testid='dashboard-filters'>
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
          </BoardFiltersStyled>
        )}
        {board.cards.length === 0 ? (
          <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Typography variant='body2' color='textSubdued'>
              {locales.ai_boards_empty}
            </Typography>
            <AddCard board={board} />
          </Stack>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={board.cards.map((card) => card.id)} strategy={rectSortingStrategy}>
              <BoardGridStyled>
                {board.cards.map((card) => (
                  <BoardCard
                    key={card.id}
                    board={board}
                    card={card}
                    editing={editing}
                    filters={filters}
                    refreshMs={refreshMs}
                  />
                ))}
              </BoardGridStyled>
            </SortableContext>
          </DndContext>
        )}
      </BoardCanvasStyled>
    </BoardRootStyled>
  );
}
