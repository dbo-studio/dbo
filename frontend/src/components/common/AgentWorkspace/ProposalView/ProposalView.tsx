import api from '@/api';
import { useChangesetReview } from '@/hooks';
import locales from '@/locales';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import MiniDiagram from '../MiniDiagram/MiniDiagram';
import SchemaDiff from '../SchemaDiff/SchemaDiff';
import SqlPreview from '../SqlPreview/SqlPreview';
import { useWorkspaceCanvas, type ProposalView as View } from '../workspaceCanvas.store';

const VIEWS: Array<{ value: View; label: string }> = [
  { value: 'design', label: locales.ai_changes_tab_diagram },
  { value: 'diff', label: locales.ai_changes_tab_diff },
  { value: 'sql', label: locales.ai_changes_tab_sql }
];

/** One proposal on the canvas: drawn as tables, as a before/after diff with per-change review, or as its SQL. */
export default function ProposalView({ changesetId }: { changesetId: number }): JSX.Element | null {
  const view = useWorkspaceCanvas((state) => state.proposalView);
  const setView = useWorkspaceCanvas((state) => state.setProposalView);
  const review = useChangesetReview(changesetId);
  const { changeset } = review;
  const { data: before } = useQuery({
    queryKey: ['ai-changeset-before', changeset?.chatId, changesetId],
    queryFn: () => api.aiChat.getChangesetBefore({ chatId: changeset?.chatId as number, id: changesetId }),
    enabled: !!changeset
  });

  if (!changeset) return null;

  return (
    <Stack spacing={1.5} sx={{ p: 1.5 }} data-testid='ai-proposal-view' data-view={view}>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <ToggleButtonGroup
          exclusive
          size='small'
          value={view}
          onChange={(_, next: View | null) => next && setView(next)}
          sx={{ alignSelf: 'flex-start', '& .MuiToggleButton-root': { py: 0.25, px: 1.25, textTransform: 'none' } }}
        >
          {VIEWS.map((item) => (
            <ToggleButton key={item.value} value={item.value} data-testid={`ai-proposal-view-${item.value}`}>
              {item.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        {changeset.undoSql.length > 0 && review.openCount === 0 && (
          <Button
            variant='text'
            disabled={review.isUndoing}
            onClick={() => void review.undo()}
            startIcon={<CustomIcon type='undo' size='xs' />}
            data-testid='ai-undo'
          >
            {locales.ai_changes_undo_title}
          </Button>
        )}
      </Stack>
      <Box>
        {view === 'design' && <MiniDiagram changeset={changeset} />}
        {view === 'diff' && (
          <SchemaDiff
            changeset={changeset}
            before={before}
            onReview={(status, position) => void review.review(status, position)}
            onEdit={(position, op) => void review.edit(position, op)}
          />
        )}
        {view === 'sql' && <SqlPreview changeset={changeset} />}
      </Box>
    </Stack>
  );
}
