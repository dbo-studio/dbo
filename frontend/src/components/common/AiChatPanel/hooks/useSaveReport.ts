import api from '@/api';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ChartReport } from '../utils/chartReport';

/** Saves a chart as a report, or updates it when it was saved before; returns the report with its id. */
export const useSaveReport = () => {
  const queryClient = useQueryClient();
  const connectionId = useConnectionStore((state) => state.currentConnectionId);

  return useMutation({
    mutationFn: async (report: ChartReport): Promise<ChartReport> => {
      const { database, schema } = useAiStore.getState().context;
      const body = { name: report.title, sql: report.sql, chart: report.spec };
      const saved = report.questionId
        ? await api.question.updateQuestion(report.questionId, body)
        : await api.question.createQuestion({ ...body, connectionId: Number(connectionId), database, schema });
      return { ...report, questionId: saved.id };
    },
    onSuccess: async () => {
      toast.success(locales.ai_report_saved);
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
    }
  });
};
