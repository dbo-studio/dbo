import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import QueryPreviewModal from '@/components/common/QueryPreviewModal/QueryPreviewModal';
import { summarizeChangeset } from '@/core/diagram/changesetSummary';
import { useChangesetReview } from '@/core/diagram/useChangesetReview';
import locales from '@/locales';
import { useDiagramChangesetStore } from '@/store/diagramChangesetStore/diagramChangeset.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AiDiagramDiff } from '@/types';
import { Box, Button, Chip, CircularProgress, Stack, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { AgentCardBodyStyled, AgentCardStyled, CardActionsStyled } from './AgentCards.styled';

/** Chat embed for an agent schema proposal: summary, Open in Diagram, Accept/Reject. */
export default function DiagramDiffCard({ diff }: { diff: AiDiagramDiff }): JSX.Element {
  const theme = useTheme();
  const review = useChangesetReview(diff);
  const pending = review.decision === undefined;
  const lines = summarizeChangeset(diff.ops);

  const openInDiagram = (): void => {
    if (pending) {
      useDiagramChangesetStore.getState().stage(diff);
    }
    useTabStore.getState().addDiagramTab({ database: diff.database ?? '', schema: diff.schema ?? '' });
  };

  const accent =
    review.decision === 'applied'
      ? theme.palette.success.main
      : review.decision === 'rejected'
        ? undefined
        : theme.palette.warning.main;

  return (
    <AgentCardStyled accent={accent} data-testid='ai-diagram-diff-card' data-decision={review.decision ?? 'pending'}>
      <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', px: 1, py: 0.75 }}>
        <CustomIcon type='network' size='xs' />
        <Typography variant='caption' sx={{ fontWeight: 600, flex: 1 }}>
          {locales.ai_schema_proposal.replace('{n}', String(diff.ops.length))}
        </Typography>
        <Chip
          size='small'
          variant='outlined'
          color={review.decision === 'applied' ? 'success' : pending ? 'warning' : 'default'}
          label={review.decision ? locales[`ai_review_${review.decision}`] : locales.ai_review_pending}
          sx={{ height: 18, fontSize: '0.6875rem' }}
        />
      </Stack>
      <AgentCardBodyStyled>
        <Box component='ul' sx={{ m: 0, pl: 2 }}>
          {lines.map((line) => (
            <Typography component='li' variant='caption' key={`${line.label}-${line.detail}`}>
              <Box component='span' sx={{ color: 'success.main', fontWeight: 600 }}>
                {line.label}
              </Box>{' '}
              {line.detail}
            </Typography>
          ))}
        </Box>
        <CardActionsStyled>
          <Button size='small' variant='text' onClick={openInDiagram} data-testid='ai-diagram-open'>
            {locales.ai_open_in_diagram}
          </Button>
          {pending && (
            <>
              <Button size='small' variant='text' color='inherit' onClick={review.reject} data-testid='ai-diagram-reject'>
                {locales.ai_reject}
              </Button>
              <Button
                size='small'
                variant='contained'
                disabled={review.isPreviewing}
                onClick={() => void review.openPreview()}
                data-testid='ai-diagram-accept'
                startIcon={review.isPreviewing ? <CircularProgress size={14} color='inherit' /> : undefined}
              >
                {locales.ai_review_apply}
              </Button>
            </>
          )}
        </CardActionsStyled>
      </AgentCardBodyStyled>
      <QueryPreviewModal
        open={review.previewQueries !== undefined}
        queries={review.previewQueries ?? []}
        isExecuting={review.isApplying}
        onCancel={review.closePreview}
        onConfirm={() => void review.apply()}
        testIdPrefix='ai-changeset'
      />
    </AgentCardStyled>
  );
}
