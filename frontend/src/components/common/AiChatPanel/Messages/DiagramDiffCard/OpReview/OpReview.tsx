import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { AiChangesetOp } from '@/types';
import { IconButton, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { OpReviewActionsStyled } from './OpReview.styled';

type OpReviewProps = {
  status: AiChangesetOp['status'];
  onReview: (status: 'accepted' | 'rejected') => void;
};

/** Keep or skip one change, like Cursor's per-change keep/undo. */
export default function OpReview({ status, onReview }: OpReviewProps): JSX.Element {
  return (
    <OpReviewActionsStyled>
      <Tooltip title={locales.ai_keep_change}>
        <IconButton
          sx={{ p: 0.25, color: status === 'accepted' ? 'success.main' : undefined }}
          onClick={() => onReview('accepted')}
          data-testid='ai-card-op-accept'
        >
          <CustomIcon type='check' size='xs' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.ai_drop_change}>
        <IconButton sx={{ p: 0.25 }} onClick={() => onReview('rejected')} data-testid='ai-card-op-reject'>
          <CustomIcon type='close' size='xs' />
        </IconButton>
      </Tooltip>
    </OpReviewActionsStyled>
  );
}
