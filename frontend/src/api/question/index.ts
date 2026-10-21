import { api } from '@/core/api';
import type { QuestionResultType, QuestionType, SaveQuestionRequestType } from './types';

export const getQuestions = async (connectionId: number): Promise<QuestionType[]> =>
  (await api.get<{ data: QuestionType[] }>('/questions', { params: { connectionId } })).data.data;

export const createQuestion = async (data: SaveQuestionRequestType): Promise<QuestionType> =>
  (await api.post<{ data: QuestionType }>('/questions', data)).data.data;

export const updateQuestion = async (id: number, data: Partial<SaveQuestionRequestType>): Promise<QuestionType> =>
  (await api.patch<{ data: QuestionType }>(`/questions/${id}`, data)).data.data;

export const deleteQuestion = async (id: number): Promise<void> => {
  await api.delete(`/questions/${id}`);
};

/** Runs the saved query read-only, with fresh data. */
export const runQuestion = async (id: number): Promise<QuestionResultType> =>
  (await api.post<{ data: QuestionResultType }>(`/questions/${id}/run`)).data.data;
