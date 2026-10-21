import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { QuestionType } from '@/api/question/types';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useWorkspaceCanvas } from '../workspaceCanvas.store';

/** Saved reports of the connection; opening one runs it again and shows it on the Report tab. */
export default function SavedReports(): JSX.Element {
  const queryClient = useQueryClient();
  const connectionId = useConnectionStore((state) => state.currentConnectionId);
  const showReport = useWorkspaceCanvas((state) => state.showReport);
  const { data: reports } = useQuery({
    queryKey: ['questions', connectionId],
    queryFn: () => api.question.getQuestions(Number(connectionId)),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] })
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
        <Box
          key={report.id}
          onClick={() => open(report)}
          data-testid='ai-saved-report'
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 0.5,
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' },
            '&:hover .report-delete': { visibility: 'visible' }
          }}
        >
          <CustomIcon type='layout' size='xs' />
          <Typography variant='caption' noWrap sx={{ flex: 1, minWidth: 0 }}>
            {report.name}
          </Typography>
          <Tooltip title={locales.ai_report_delete}>
            <IconButton
              size='small'
              className='report-delete'
              sx={{ visibility: 'hidden' }}
              onClick={(event) => {
                event.stopPropagation();
                remove(report.id);
              }}
              data-testid='ai-saved-report-delete'
            >
              <CustomIcon type='close' size='xs' />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Box>
  );
}
