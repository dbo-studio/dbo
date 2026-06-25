import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import Search from '@/components/base/Search/Search';
import { useContextMenu, useCurrentConnection, useSelectedTab } from '@/hooks';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { TreeNodeType } from '@/types/Tree';
import { Box, LinearProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { type JSX, useEffect, useRef, useState } from 'react';
import { TreeViewContainerStyled, TreeViewContentStyled } from './ObjectTreeView.styled';
import TreeNode from './TreeNode/TreeNode';

export default function ObjectTreeView(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const selectedTab = useSelectedTab();
  const isLoading = useTreeStore((state) => state.isLoading);
  const treeError = useTreeStore((state) => state.treeError);
  const [menu, setMenu] = useState<MenuType[]>([]);

  const addLoadedParentId = useTreeStore((state) => state.addLoadedParentId);
  const reloadTree = useTreeStore((state) => state.reloadTree);

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const parentRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

  const tree = useTreeStore((state) =>
    currentConnection?.id ? (state.tree[currentConnection.id] ?? null) : null
  );

  const { mutateAsync: getChildrenMutation } = useMutation({
    mutationFn: api.tree.getTree
  });

  useEffect(() => {
    if (!treeError && !tree && !isLoading && currentConnection?.id) {
      reloadTree(true).catch((e) => console.log('🚀 ~ ObjectTreeView ~ e:', e));
    }
  }, [currentConnection?.id, tree, treeError, isLoading, reloadTree]);

  const fetchChildren = async (parentId: string): Promise<TreeNodeType[]> => {
    try {
      addLoadedParentId(parentId);

      const nodes = await getChildrenMutation({
        parentId,
        connectionId: currentConnection?.id || 0,
        fromCache: true
      });
      return nodes?.children || [];
    } catch (error) {
      console.debug('🚀 ~ fetchChildren ~ error:', error);
      return [];
    }
  };

  const onContextMenu = (event: React.MouseEvent, menu: MenuType[]): void => {
    event.stopPropagation();
    setMenu(menu);
    handleContextMenu(event);
  };

  return (
    <TreeViewContainerStyled>
      <Box
        sx={{
          mt: 1
        }}
      >
        <Search onChange={(value: string): void => setSearchTerm(value)} />
      </Box>
      {isLoading && (
        <Box
          sx={{
            px: 1,
            py: 0.5
          }}
        >
          <LinearProgress sx={{ height: 2 }} />
        </Box>
      )}
      <TreeViewContentStyled>
        {tree && (
          <TreeNode
            node={tree}
            fetchChildren={fetchChildren}
            parentRefsRef={parentRefsRef}
            nodeIndex={0}
            level={0}
            searchTerm={searchTerm}
            onContextMenu={onContextMenu}
            selectedNodeId={selectedTab?.nodeId}
          />
        )}

        {menu.length > 0 && (
          <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
        )}
      </TreeViewContentStyled>
    </TreeViewContainerStyled>
  );
}
