import { useWorkspaceCanvas } from '@/components/common/AgentWorkspace/workspaceCanvas.store';
import { changeCount } from '@/core/ai/changeCount';
import locales from '@/locales';
import { isOpen, useChangesetStore } from '@/store/changesetStore/changeset.store';
import type { JSX } from 'react';
import DiagramDiffCard from '../../DiagramDiffCard/DiagramDiffCard';
import ArtifactChip, { useInWorkstation } from '../../ArtifactChip/ArtifactChip';

type ProposalItemProps = {
  changesetId: number;
};

/** A proposal: reviewed on the canvas in the workstation, so the chat links to it there. */
export default function ProposalItem({ changesetId }: ProposalItemProps): JSX.Element {
  const inWorkstation = useInWorkstation();
  const changeset = useChangesetStore((state) => state.changesets[changesetId]);
  if (!inWorkstation) return <DiagramDiffCard changesetId={changesetId} />;

  const ops = changeset?.ops ?? [];
  const status = ops.some((op) => isOpen(op.status))
    ? locales.ai_review_pending
    : ops.some((op) => op.status === 'applied')
      ? locales.ai_review_applied
      : locales.ai_review_rejected;

  return (
    <ArtifactChip
      icon='structure'
      label={locales.ai_canvas_proposal.replace('{changes}', changeCount(ops.length))}
      detail={status}
      testId='ai-chip-proposal'
      onOpen={() => useWorkspaceCanvas.getState().openProposal(changesetId)}
    />
  );
}