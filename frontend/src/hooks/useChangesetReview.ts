import api from '@/api';
import { recordReview } from '@/core/ai/recordReview';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiReviewDecision } from '@/store/aiStore/types';
import { useDiagramChangesetStore } from '@/store/diagramChangesetStore/diagramChangeset.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { AiDiagramDiff } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

type ChangesetReview = {
  decision: AiReviewDecision | undefined;
  previewQueries: string[] | undefined;
  isPreviewing: boolean;
  isApplying: boolean;
  openPreview: () => Promise<void>;
  closePreview: () => void;
  apply: () => Promise<void>;
  reject: () => void;
};

/**
 * Accept/reject flow for an agent-proposed schema changeset: preview the
 * dialect SQL, then apply it through the Safe Mode gate. Nothing reaches the
 * database before the user confirms the preview.
 */
export const useChangesetReview = (diff: AiDiagramDiff): ChangesetReview => {
  const queryClient = useQueryClient();
  const decision = useAiStore((state) => state.reviews[diff.changesetId]) ?? diff.decision;
  const [previewQueries, setPreviewQueries] = useState<string[]>();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const request = {
    connectionId: diff.connectionId,
    database: diff.database || undefined,
    schema: diff.schema || undefined,
    ops: diff.ops
  };

  const openPreview = async (): Promise<void> => {
    setIsPreviewing(true);
    try {
      setPreviewQueries(await api.schema.previewChange(request));
    } finally {
      setIsPreviewing(false);
    }
  };

  const apply = async (): Promise<void> => {
    setIsApplying(true);
    try {
      const applied = await withSafeModeRetry((confirmed) => api.schema.applyChange({ ...request, confirmed }));
      if (!applied) return;

      recordReview(diff.changesetId, 'applied');
      useDiagramChangesetStore.getState().discard(diff.changesetId);
      setPreviewQueries(undefined);
      toast.success(locales.ai_changeset_applied);

      await useTreeStore.getState().reloadTree(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schema-diagram'] }),
        queryClient.invalidateQueries({ queryKey: ['autocomplete'] }),
        queryClient.invalidateQueries({ queryKey: ['ai_autocomplete'] })
      ]);
    } finally {
      setIsApplying(false);
    }
  };

  const reject = useCallback((): void => {
    recordReview(diff.changesetId, 'rejected');
    useDiagramChangesetStore.getState().discard(diff.changesetId);
  }, [diff.changesetId]);

  return {
    decision,
    previewQueries,
    isPreviewing,
    isApplying,
    openPreview,
    closePreview: () => setPreviewQueries(undefined),
    apply,
    reject
  };
};
