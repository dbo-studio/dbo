import type { AiChangeset } from '@/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';

/** One staged agent proposal per connection/database/schema diagram. */
export const changesetKey = (
  connectionId: number | string,
  database: string | undefined,
  schema: string | undefined
): string => `${connectionId}:${database ?? ''}:${schema ?? ''}`;

/** Ops the user can still accept, reject or apply. */
export const isOpen = (status: AiChangeset['ops'][number]['status']): boolean =>
  status !== 'rejected' && status !== 'applied';

type ChangesetState = {
  changesets: Record<number, AiChangeset>;
  /** Changeset shown on the diagram of a scope, by id. */
  staged: Record<string, number>;
  upsert: (changesets: AiChangeset[]) => void;
  stage: (changeset: AiChangeset) => void;
};

export const useChangesetStore: UseBoundStore<StoreApi<ChangesetState>> = create<ChangesetState>()(
  devtools(
    (set) => ({
      changesets: {},
      staged: {},
      upsert: (changesets) => {
        set(
          (state) => ({
            changesets: { ...state.changesets, ...Object.fromEntries(changesets.map((item) => [item.id, item])) }
          }),
          undefined,
          'upsert'
        );
      },
      stage: (changeset) => {
        set(
          (state) => ({
            changesets: { ...state.changesets, [changeset.id]: changeset },
            staged: {
              ...state.staged,
              [changesetKey(changeset.connectionId, changeset.database, changeset.schema)]: changeset.id
            }
          }),
          undefined,
          'stage'
        );
      }
    }),
    { name: 'changeset' }
  )
);
