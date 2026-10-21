import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import QueryPreviewModal from '@/components/common/QueryPreviewModal/QueryPreviewModal';
import { summarizeChangeset } from '@/core/diagram/changesetSummary';
import { useChangesetReview } from '@/hooks';
import { changeCount } from '@/core/ai/changeCount';
import locales from '@/locales';
import { isOpen, useChangesetStore } from '@/store/changesetStore/changeset.store';
import api from '@/api';
import { toast } from 'sonner';
import { IconButton, Tooltip } from '@mui/material';
import type { AiChangesetOp } from '@/types';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Button, Chip, CircularProgress, Stack, Typography, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import { AgentCardBodyStyled, AgentCardStyled, CardActionsStyled } from '../AgentCards.styled';
import DiagramThumbnail from '../DiagramThumbnail/DiagramThumbnail';
import { variables } from '@/core/theme/variables';

/** Keep or skip one change, like Cursor's per-change keep/undo. */
function OpReview({
  status,
  onReview
}: {
  status: AiChangesetOp['status'];
  onReview: (status: 'accepted' | 'rejected') => void;
}): JSX.Element {
  return (
    <Box component='span' sx={{ display: 'inline-flex', ml: 0.5, verticalAlign: 'middle' }}>
      <Tooltip title={locales.ai_keep_change}>
        <IconButton
          size='small'
          sx={{ p: 0.25, color: status === 'accepted' ? 'success.main' : undefined }}
          onClick={() => onReview('accepted')}
          data-testid='ai-card-op-accept'
        >
          <CustomIcon type='check' size='xs' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.ai_drop_change}>
        <IconButton size='small' sx={{ p: 0.25 }} onClick={() => onReview('rejected')} data-testid='ai-card-op-reject'>
          <CustomIcon type='close' size='xs' />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

/** Chat embed for an agent schema proposal: summary, keep/skip per change, apply, and Undo once applied. */
export default function DiagramDiffCard({ changesetId }: { changesetId: number }): JSX.Element | null {
  const theme = useTheme();
  const review = useChangesetReview(changesetId);
  const [undoing, setUndoing] = useState(false);
  const { changeset } = review;
  if (!changeset) return null;

  const pending = review.openCount > 0;
  const decision = pending ? undefined : changeset.ops.some((op) => op.status === 'applied') ? 'applied' : 'rejected';
  const lines = summarizeChangeset(changeset.ops);

  // Undo becomes a new changeset of compensating SQL, reviewed and applied from the review bar.
  const undo = async (): Promise<void> => {
    setUndoing(true);
    try {
      useChangesetStore.getState().upsert([await api.aiChat.undoChangeset(changeset)]);
      toast.success(locales.ai_undo_ready);
    } catch {
      /* the API layer shows the error */
    } finally {
      setUndoing(false);
    }
  };

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
          {locales.ai_schema_proposal.replace('{changes}', changeCount(changeset.ops.length))}
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
              {isOpen(changeset.ops[index].status) && (
                <OpReview
                  status={changeset.ops[index].status}
                  onReview={(status) => void review.review(status, changeset.ops[index].position)}
                />
              )}
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
          {changeset.undoSql.length > 0 && !pending && (
            <Button
              size='small'
              variant='text'
              disabled={undoing}
              onClick={() => void undo()}
              startIcon={<CustomIcon type='undo' size='xs' />}
              data-testid='ai-undo'
            >
              {locales.ai_changes_undo_title}
            </Button>
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
