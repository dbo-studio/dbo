import api from '@/api';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import ReportEditor from '@/components/common/AgentWorkspace/ReportEditor/ReportEditor';
import type { ChartReport } from '@/components/common/AiChatPanel/utils/chartReport';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import type { QuestionTabType } from '@/types/Tab';
import { Box, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { questionParams } from '@/core/charts/chartSpec';

/** A saved question opened from the tree: SQL, chart settings and a live preview. */
export default function Question(): JSX.Element {
  const tab = useSelectedTab() as QuestionTabType;
  const connectionId = Number(tab.connectionId);
  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', connectionId],
    queryFn: () => api.question.getQuestions(connectionId)
  });
  const question = questions?.find((item) => item.id === tab.questionId);
  const { data: result, isFetching: running } = useQuery({
    queryKey: ['question-run', tab.questionId],
    queryFn: () => api.question.runQuestion(tab.questionId),
    // A report with {{filters}} waits for the user to fill them in the editor.
    enabled: !!question && questionParams(question.sql).length === 0
  });

  if (isLoading || (question && running && !result)) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!question) {
    return <EmptyState title={locales.question_not_found} />;
  }

  const report: ChartReport = {
    id: `question-${question.id}`,
    title: question.name,
    sql: question.sql,
    spec: question.chart,
    rows: result?.rows ?? [],
    columns: result?.columns?.map((column) => column.name) ?? Object.keys(result?.rows[0] ?? {}),
    questionId: question.id
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }} data-testid='question-tab'>
      {/* Keyed so a different question starts from its own SQL and chart. */}
      <ReportEditor key={question.id} report={report} scope={{ database: question.database, schema: question.schema }} />
    </Box>
  );
}
