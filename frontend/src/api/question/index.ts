import { api } from '@/core/api';
import type { PreviewQuestionRequestType, QuestionParams, QuestionResultType, QuestionType, SaveQuestionRequestType } from './types';

export const getQuestions = async (connectionId: number): Promise<QuestionType[]> =>
  (await api.get<{ data: QuestionType[] }>('/questions', { params: { connectionId } })).data.data;

export const createQuestion = async (data: SaveQuestionRequestType): Promise<QuestionType> =>
  (await api.post<{ data: QuestionType }>('/questions', data)).data.data;

export const updateQuestion = async (id: number, data: Partial<SaveQuestionRequestType>): Promise<QuestionType> =>
  (await api.patch<{ data: QuestionType }>(`/questions/${id}`, data)).data.data;

export const deleteQuestion = async (id: number): Promise<void> => {
  await api.delete(`/questions/${id}`);
};

/** Runs the saved query read-only, with fresh data; `params` fill its {{name}} filters. */
export const runQuestion = async (id: number, params?: QuestionParams): Promise<QuestionResultType> =>
  (await api.post<{ data: QuestionResultType }>(`/questions/${id}/run`, { params })).data.data;

/** Runs unsaved SQL from the editor the way a saved report runs. */
export const previewQuestion = async (data: PreviewQuestionRequestType, signal?: AbortSignal): Promise<QuestionResultType> =>
  (await api.post<{ data: QuestionResultType }>('/questions/preview', data, { signal })).data.data;
