import QueryPreviewModal from '@/components/common/QueryPreviewModal/QueryPreviewModal';
import { summarizeChangeset } from '@/core/diagram/changesetSummary';
import { useChangesetReview } from '@/hooks';
import locales from '@/locales';
import type { AiDiagramDiff } from '@/types';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Panel } from '@xyflow/react';
import type { JSX } from 'react';
import { ChangesetPanelStyled } from './ChangesetPanel.styled';

/** Dock over the canvas for a pending agent changeset: Reject or Review & apply. */
export default function ChangesetPanel({ diff }: { diff: AiDiagramDiff }): JSX.Element {
  const review = useChangesetReview(diff);
  const lines = summarizeChangeset(diff.ops);

  return (
    <Panel position='top-center'>
      <ChangesetPanelStyled data-testid='diagram-changeset-panel'>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant='subtitle2'>
            {locales.ai_changeset_pending.replace('{n}', String(diff.ops.length))}
          </Typography>
          <Typography variant='caption' color='textSubdued' noWrap title={lines.map((l) => l.detail).join('\n')}>
            {lines.map((line) => line.detail).join(' · ')}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} sx={{ flexShrink: 0 }}>
          <Button size='small' variant='text' onClick={review.reject} data-testid='diagram-changeset-reject'>
            {locales.ai_reject}
          </Button>
          <Button
            size='small'
            variant='contained'
            disabled={review.isPreviewing}
            onClick={() => void review.openPreview()}
            data-testid='diagram-changeset-accept'
            startIcon={review.isPreviewing ? <CircularProgress size={14} color='inherit' /> : undefined}
          >
            {locales.ai_review_apply}
          </Button>
        </Stack>
      </ChangesetPanelStyled>
      <QueryPreviewModal
        open={review.previewQueries !== undefined}
        queries={review.previewQueries ?? []}
        isExecuting={review.isApplying}
        onCancel={review.closePreview}
        onConfirm={() => void review.apply()}
        testIdPrefix='diagram-changeset'
      />
    </Panel>
  );
}
