import api from '@/api';
import type { DashboardType } from '@/api/dashboard/types';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useSetBoard } from '../useSetBoard';
import { AddCardRootStyled } from './AddCard.styled';

/** Picks a saved report that is not on the board yet and adds it as a card. */
export default function AddCard({ board }: { board: DashboardType }): JSX.Element {
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
    <AddCardRootStyled>
      <SelectInput
        testId='dashboard-add-card'
        label={locales.dashboard_add_card}
        // Shown only when the list is empty, where the select is disabled.
        emptylabel={locales.dashboard_add_card_none}
        value=''
        options={options}
        onChange={(value) => pin((value as SelectInputOption).value as number)}
      />
    </AddCardRootStyled>
  );
}