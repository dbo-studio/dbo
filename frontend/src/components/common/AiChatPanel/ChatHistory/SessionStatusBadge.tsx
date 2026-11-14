import { variables } from '@/core/theme/variables';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { isOpen, useChangesetStore } from '@/store/changesetStore/changeset.store';
import { Chip } from '@mui/material';
import type { JSX } from 'react';

type SessionStatus = 'running' | 'error' | 'needs_review' | 'done';

const COLORS = { running: 'primary', error: 'error', needs_review: 'warning', done: 'success' } as const;

/** What a chat is doing: running a turn, failed, waiting for the user's review, or finished unseen. */
export default function SessionStatusBadge({ chatId }: { chatId: number }): JSX.Element | null {
  const session = useAiStore((state) => state.sessions[chatId]);
  const needsReview = useChangesetStore((state) =>
    Object.values(state.changesets).some(
      (changeset) => changeset.chatId === chatId && changeset.ops.some((op) => isOpen(op.status))
    )
  );

  const status: SessionStatus | undefined =
    session?.streaming.status === 'streaming'
      ? 'running'
      : session?.streaming.error
        ? 'error'
        : needsReview
          ? 'needs_review'
          : session?.unseen
            ? 'done'
            : undefined;
  if (!status) return null;

  return (
    <Chip
      variant='outlined'
      color={COLORS[status]}
      label={locales[`ai_session_${status}`]}
      sx={{ height: 16, fontSize: variables.fontSize.xxs, flexShrink: 0 }}
      data-testid='ai-session-status'
      data-status={status}
    />
  );
}
