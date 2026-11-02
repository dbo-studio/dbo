import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { QuestionType } from '@/api/question/types';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useWorkspaceCanvas } from '../workspaceCanvas.store';

/** Saved reports and boards of the connection; opening a report runs it again on the Report tab, a board opens on the Board tab. */
export default function SavedReports(): JSX.Element {
  const queryClient = useQueryClient();
  const connectionId = useConnectionStore((state) => state.currentConnectionId);
  const showReport = useWorkspaceCanvas((state) => state.showReport);
  const showBoard = useWorkspaceCanvas((state) => state.showBoard);
  const { data: boards } = useQuery({
    queryKey: ['dashboards', Number(connectionId)],
    queryFn: () => api.dashboard.getDashboards(Number(connectionId)),
    // Lists change behind this screen (the agent saves and pins), so a stale one reloads on open.
    refetchOnMount: true,
    enabled: !!connectionId
  });
  const { mutate: removeBoard } = useMutation({
    mutationFn: (id: number) => api.dashboard.deleteDashboard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboards'], refetchType: 'all' })
  });
  const { data: reports } = useQuery({
    queryKey: ['questions', connectionId],
    queryFn: () => api.question.getQuestions(Number(connectionId)),
    // Lists change behind this screen (the agent saves and pins), so a stale one reloads on open.
    refetchOnMount: true,
    enabled: !!connectionId
  });

  const { mutate: open } = useMutation({
    mutationFn: async (question: QuestionType) => ({ question, result: await api.question.runQuestion(question.id) }),
    onSuccess: ({ question, result }) =>
      showReport({
        id: `question-${question.id}`,
        questionId: question.id,
        title: question.name,
        sql: question.sql,
        spec: question.chart,
        rows: result.rows,
        columns: result.columns?.map((column) => column.name) ?? Object.keys(result.rows[0] ?? {})
      })
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: number) => api.question.deleteQuestion(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['questions'], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['dashboards'], refetchType: 'all' });
    }
  });

  return (
    <Box sx={{ px: 1, pb: 1 }} data-testid='ai-saved-reports'>
      <Typography variant='subtitle2' sx={{ px: 0.5, py: 1 }}>
        {locales.ai_reports}
      </Typography>
      {reports?.length === 0 && (
        <Typography variant='caption' color='textSubdued' sx={{ px: 0.5 }}>
          {locales.ai_reports_empty}
        </Typography>
      )}
      {reports?.map((report) => (
        <ListRow
          key={report.id}
          label={report.name}
          onOpen={() => open(report)}
          onDelete={() => remove(report.id)}
          deleteLabel={locales.ai_report_delete}
          testId='ai-saved-report'
        />
      ))}
      <Typography variant='subtitle2' sx={{ px: 0.5, py: 1 }}>
        {locales.ai_boards}
      </Typography>
      {boards?.length === 0 && (
        <Typography variant='caption' color='textSubdued' sx={{ px: 0.5 }}>
          {locales.ai_boards_empty}
        </Typography>
      )}
      {boards?.map((board) => (
        <ListRow
          key={board.id}
          label={`${board.name} · ${board.cards.length}`}
          onOpen={() => showBoard(board.id)}
          onDelete={() => removeBoard(board.id)}
          deleteLabel={locales.ai_board_delete}
          testId='ai-board-item'
        />
      ))}
    </Box>
  );
}

function ListRow({
  label,
  onOpen,
  onDelete,
  deleteLabel,
  testId
}: {
  label: string;
  onOpen: () => void;
  onDelete: () => void;
  deleteLabel: string;
  testId: string;
}): JSX.Element {
  return (
    <Box
      onClick={onOpen}
      data-testid={testId}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 0.5,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
        '&:hover .row-delete': { visibility: 'visible' }
      }}
    >
      <CustomIcon type='layout' size='xs' />
      <Typography variant='caption' noWrap sx={{ flex: 1, minWidth: 0 }}>
        {label}
      </Typography>
      <Tooltip title={deleteLabel}>
        <IconButton
          size='small'
          className='row-delete'
          sx={{ visibility: 'hidden' }}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          data-testid={`${testId}-delete`}
        >
          <CustomIcon type='close' size='xs' />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
