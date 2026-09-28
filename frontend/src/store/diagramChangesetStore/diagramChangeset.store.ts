import type { AiDiagramDiff } from '@/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';

/** One pending agent proposal per connection/database/schema diagram. */
export const changesetKey = (
  connectionId: number | string,
  database: string | undefined,
  schema: string | undefined
): string => `${connectionId}:${database ?? ''}:${schema ?? ''}`;

type DiagramChangesetState = {
  changesets: Record<string, AiDiagramDiff>;
  stage: (diff: AiDiagramDiff) => void;
  discard: (changesetId: string) => void;
};

export const useDiagramChangesetStore: UseBoundStore<StoreApi<DiagramChangesetState>> =
  create<DiagramChangesetState>()(
    devtools(
      (set, get) => ({
        changesets: {},
        stage: (diff) => {
          const key = changesetKey(diff.connectionId, diff.database, diff.schema);
          set({ changesets: { ...get().changesets, [key]: diff } }, undefined, 'stage');
        },
        discard: (changesetId) => {
          const changesets = Object.fromEntries(
            Object.entries(get().changesets).filter(([, diff]) => diff.changesetId !== changesetId)
          );
          set({ changesets }, undefined, 'discard');
        }
      }),
      { name: 'diagramChangeset' }
    )
  );
