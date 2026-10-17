import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import ListRow from '@/components/base/ListRow/ListRow';
import ListSkeleton from '@/components/base/ListSkeleton/ListSkeleton';
import PullIndicator from '@/components/base/PullIndicator/PullIndicator';
import Search from '@/components/base/Search/Search';
import { usePullToRefresh, useTreeLevel } from '@/hooks';
import locales from '@/locales';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { TreeNodeType } from '@/types/Tree';
import { IconButton, LinearProgress, Typography } from '@mui/material';
import { type JSX, type MouseEvent, useState } from 'react';
import { useActionDetection } from '../ObjectTreeView/TreeNode/hooks/useActionDetection';
import { MobileTreeListMessageStyled, MobileTreeListSearchStyled, MobileTreeListStyled } from './MobileTreeList.styled';
import NodeActionSheet from './NodeActionSheet/NodeActionSheet';
import type { MobileTreeListProps } from './types';

const SEARCH_THRESHOLD = 8;

// Shared tree hooks take a mouse event; a tap has nothing to stop from propagating.
const tapEvent = { stopPropagation: (): void => {} } as MouseEvent;
// actionDetection only expands action-less nodes, which handleTap drills into before calling it.
const noExpand = async (): Promise<void> => {};

export default function MobileTreeList({ nodeId, onDrill }: MobileTreeListProps): JSX.Element {
  const { node, loading, error } = useTreeLevel(nodeId);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const { bind, pull, progress } = usePullToRefresh(
    (): void => void reloadTree(false).catch(() => undefined),
    !loading
  );
  const { actionDetection } = useActionDetection(noExpand);
  const [search, setSearch] = useState('');
  const [actionsFor, setActionsFor] = useState<TreeNodeType | undefined>(undefined);

  const children = node?.children ?? [];
  const term = search.trim().toLowerCase();
  const visible = term ? children.filter((c) => c.name.toLowerCase().includes(term)) : children;

  // Nodes without their own action drill in; the rest run it (e.g. a table opens its data tab).
  const handleTap = (child: TreeNodeType): void => {
    if (!child.action) {
      onDrill(child);
      return;
    }
    void actionDetection(tapEvent, child);
  };

  const handleDrill = (event: MouseEvent, child: TreeNodeType): void => {
    event.stopPropagation();
    onDrill(child);
  };

  return (
    <MobileTreeListStyled {...bind} data-testid='mobile-tree-list'>
      <PullIndicator pull={pull} progress={progress} />
      {actionsFor && (
        <NodeActionSheet
          node={actionsFor}
          actionDetection={actionDetection}
          onClose={(): void => setActionsFor(undefined)}
        />
      )}
      {children.length > SEARCH_THRESHOLD && (
        <MobileTreeListSearchStyled>
          <Search onChange={setSearch} />
        </MobileTreeListSearchStyled>
      )}
      {loading && (children.length === 0 ? <ListSkeleton /> : <LinearProgress />)}
      {error && !loading && children.length === 0 && (
        <MobileTreeListMessageStyled>
          <Typography color='error'>{locales.mobile_load_failed}</Typography>
        </MobileTreeListMessageStyled>
      )}
      {!loading && !error && node && children.length === 0 && (
        <MobileTreeListMessageStyled>
          <Typography color='textSubdued'>{locales.mobile_level_empty}</Typography>
        </MobileTreeListMessageStyled>
      )}
      {visible.map((child) => (
        <ListRow
          key={child.id}
          testId={`mobile-node-${child.name}`}
          leading={child.icon ? <CustomIcon type={child.icon as keyof typeof IconTypes} size='m' /> : undefined}
          title={child.name}
          chevron={!child.action && child.hasChildren}
          onClick={(): void => handleTap(child)}
          onLongPress={(): void => setActionsFor(child)}
          trailing={
            child.action && child.hasChildren ? (
              <IconButton
                component='span'
                aria-label={locales.mobile_browse}
                onClick={(event): void => handleDrill(event, child)}
              >
                <CustomIcon type='chevronRight' size='s' />
              </IconButton>
            ) : undefined
          }
        />
      ))}
    </MobileTreeListStyled>
  );
}
