import api from '@/api';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { isOpen, useChangesetStore } from '@/store/changesetStore/changeset.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { AiChangeset, AiChangesetOpStatus } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

type ChangesetReview = {
  changeset: AiChangeset | undefined;
  openCount: number;
  previewQueries: string[] | undefined;
  isPreviewing: boolean;
  isApplying: boolean;
  openPreview: () => Promise<void>;
  closePreview: () => void;
  apply: () => Promise<void>;
  /** Accepts, rejects or resets one op, or every open op when `position` is omitted. */
  review: (status: Exclude<AiChangesetOpStatus, 'applied' | 'failed'>, position?: number) => Promise<void>;
};

/**
 * Review flow for an agent-proposed schema changeset, which lives on the
 * server: per-op accept/reject, SQL preview, then apply through the Safe Mode
 * gate. Nothing reaches the database before the user applies.
 */
export const useChangesetReview = (changesetId: number): ChangesetReview => {
  const queryClient = useQueryClient();
  const changeset = useChangesetStore((state) => state.changesets[changesetId]);
  const upsert = useChangesetStore((state) => state.upsert);
  const [previewQueries, setPreviewQueries] = useState<string[]>();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const review: ChangesetReview['review'] = async (status, position) => {
    if (changeset) upsert([await api.aiChat.reviewChangeset(changeset, status, position)]);
  };

  const openPreview = async (): Promise<void> => {
    if (!changeset) return;
    setIsPreviewing(true);
    try {
      setPreviewQueries(await api.aiChat.previewChangeset(changeset));
    } finally {
      setIsPreviewing(false);
    }
  };

  const apply = async (): Promise<void> => {
    if (!changeset) return;
    setIsApplying(true);
    try {
      const result = await withSafeModeRetry((confirmed) => api.aiChat.applyChangeset(changeset, !!confirmed));
      if (!result) return;

      upsert([result]);
      setPreviewQueries(undefined);

      const failed = result.ops.find((op) => op.status === 'failed');
      if (failed) {
        toast.error(failed.error ?? locales.ai_changeset_failed);
      } else {
        toast.success(locales.ai_changeset_applied);
      }

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

  return {
    changeset,
    openCount: changeset?.ops.filter((op) => isOpen(op.status)).length ?? 0,
    previewQueries,
    isPreviewing,
    isApplying,
    openPreview,
    closePreview: () => setPreviewQueries(undefined),
    apply,
    review
  };
};
