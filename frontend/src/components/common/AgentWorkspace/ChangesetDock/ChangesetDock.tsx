import QueryPreviewModal from '@/components/common/QueryPreviewModal/QueryPreviewModal';
import type { useChangesetReview } from '@/hooks';
import { changeCount } from '@/core/ai/changeCount';
import locales from '@/locales';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { type JSX } from 'react';

type ChangesetDockProps = {
  review: ReturnType<typeof useChangesetReview>;
  onReview: () => void;
};

/** Bar above the composer while a proposal waits: count, Review, Apply all, Reject all. */
export default function ChangesetDock({ review, onReview }: ChangesetDockProps): JSX.Element {
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, flexWrap: 'wrap' }}
      data-testid='ai-changeset-dock'
    >
      <Typography variant='caption' sx={{ flex: 1 }}>
        {locales.ai_changes_dock.replace('{changes}', changeCount(review.openCount))}
      </Typography>
      <Button size='small' variant='text' onClick={onReview} data-testid='ai-dock-review'>
        {locales.ai_changes_review}
      </Button>
      <Button
        size='small'
        variant='text'
        color='inherit'
        onClick={() => void review.review('rejected')}
        data-testid='ai-dock-reject-all'
      >
        {locales.ai_changes_reject_all}
      </Button>
      <Button
        size='small'
        variant='contained'
        disabled={review.isPreviewing}
        onClick={() => void review.openPreview()}
        data-testid='ai-dock-apply-all'
        startIcon={review.isPreviewing ? <CircularProgress size={14} color='inherit' /> : undefined}
      >
        {locales.ai_changes_apply_all}
      </Button>
      <QueryPreviewModal
        open={review.previewQueries !== undefined}
        queries={review.previewQueries ?? []}
        isExecuting={review.isApplying}
        onCancel={review.closePreview}
        onConfirm={() => void review.apply()}
        testIdPrefix='ai-dock'
      />
    </Box>
  );
}
