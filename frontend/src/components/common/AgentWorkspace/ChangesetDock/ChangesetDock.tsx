import QueryPreviewModal from '@/components/common/QueryPreviewModal/QueryPreviewModal';
import type { useChangesetReview } from '@/hooks';
import { changeCount } from '@/core/ai/changeCount';
import { isMysqlDriver } from '@/core/db/connectionAliases';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { type JSX } from 'react';

type ChangesetDockProps = {
  review: ReturnType<typeof useChangesetReview>;
  onReview: () => void;
};

/** Bar above the composer while a proposal waits: count, Review, Apply all, Reject all. */
export default function ChangesetDock({ review, onReview }: ChangesetDockProps): JSX.Element {
  const ops = review.changeset?.ops ?? [];
  // MySQL commits each DDL statement on its own, so a failure midway leaves the earlier steps in place.
  const nonAtomic =
    isMysqlDriver(useCurrentConnection()?.type) &&
    ops.some((op) => op.op !== 'write' && op.status !== 'applied' && op.status !== 'rejected');
  const failed = ops.find((op) => op.status === 'failed');
  const applied = ops.filter((op) => op.status === 'applied').length;

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, flexWrap: 'wrap' }}
      data-testid='ai-changeset-dock'
    >
      {failed && applied > 0 && (
        <Typography variant='caption' color='error' sx={{ width: '100%' }} data-testid='ai-dock-partial'>
          {locales.ai_changes_partial
            .replace('{applied}', String(applied))
            .replace('{total}', String(ops.length))
            .replace('{step}', String(ops.indexOf(failed) + 1))
            .replace('{error}', failed.error ?? locales.ai_changeset_failed)}
        </Typography>
      )}
      {nonAtomic && (
        <Typography variant='caption' color='warning.main' sx={{ width: '100%' }} data-testid='ai-dock-mysql-notice'>
          {locales.ai_changes_mysql_notice}
        </Typography>
      )}
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
        confirmText={review.dropConfirm}
        testIdPrefix='ai-dock'
      />
    </Box>
  );
}
