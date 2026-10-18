import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import QueryPreviewModal from '@/components/common/QueryPreviewModal/QueryPreviewModal';
import { summarizeChangeset } from '@/core/diagram/changesetSummary';
import { useChangesetReview } from '@/hooks';
import locales from '@/locales';
import { useChangesetStore } from '@/store/changesetStore/changeset.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Button, Chip, CircularProgress, Stack, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { AgentCardBodyStyled, AgentCardStyled, CardActionsStyled } from '../AgentCards.styled';
import DiagramThumbnail from '../DiagramThumbnail/DiagramThumbnail';
import { variables } from '@/core/theme/variables';

/** Chat embed for an agent schema proposal: summary, Open in Diagram, Accept/Reject. */
export default function DiagramDiffCard({ changesetId }: { changesetId: number }): JSX.Element | null {
  const theme = useTheme();
  const review = useChangesetReview(changesetId);
  const { changeset } = review;
  if (!changeset) return null;

  const pending = review.openCount > 0;
  const decision = pending ? undefined : changeset.ops.some((op) => op.status === 'applied') ? 'applied' : 'rejected';
  const lines = summarizeChangeset(changeset.ops);

  const openInDiagram = (): void => {
    if (pending) {
      useChangesetStore.getState().stage(changeset);
    }
    useTabStore.getState().addDiagramTab({ database: changeset.database ?? '', schema: changeset.schema ?? '' });
  };

  const accent =
    decision === 'applied'
      ? theme.palette.success.main
      : decision === 'rejected'
        ? undefined
        : theme.palette.warning.main;

  return (
    <AgentCardStyled accent={accent} data-testid='ai-diagram-diff-card' data-decision={decision ?? 'pending'}>
      <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', px: 1, py: 0.75 }}>
        <CustomIcon type='network' size='xs' />
        <Typography variant='caption' sx={{ fontWeight: 600, flex: 1 }}>
          {locales.ai_schema_proposal.replace('{n}', String(changeset.ops.length))}
        </Typography>
        <Chip
          size='small'
          variant='outlined'
          color={decision === 'applied' ? 'success' : pending ? 'warning' : 'default'}
          label={decision ? locales[`ai_review_${decision}`] : locales.ai_review_pending}
          sx={{ height: 18, fontSize: variables.fontSize.xs }}
        />
      </Stack>
      <AgentCardBodyStyled>
        <DiagramThumbnail ops={changeset.diagramOps} />
        <Box component='ul' sx={{ m: 0, pl: 2 }}>
          {lines.map((line, index) => (
            <Typography
              component='li'
              variant='caption'
              key={`${line.label}-${line.detail}`}
              sx={{ textDecoration: changeset.ops[index].status === 'rejected' ? 'line-through' : undefined }}
            >
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
              <Button
                size='small'
                variant='text'
                color='inherit'
                onClick={() => void review.review('rejected')}
                data-testid='ai-diagram-reject'
              >
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
