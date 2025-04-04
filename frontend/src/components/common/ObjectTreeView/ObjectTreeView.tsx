import api from '@/api';
import type { TreeNodeType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Box, LinearProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { type JSX, useEffect, useRef } from 'react';
import { TreeViewContainerStyled, TreeViewContentStyled } from './ObjectTreeView.styled';
import TreeNode from './TreeNode/TreeNode';

export default function ObjectTreeView(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const { tree, isLoading, treeError, reloadTree, addLoadedParentId } = useTreeStore();
  const parentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { mutateAsync: getChildrenMutation } = useMutation({
    mutationFn: api.tree.getTree,
    onError: (error): void => {
      console.error('🚀 ~ getChildrenMutation ~ error:', error);
    }
  });

  useEffect(() => {
    if (!treeError && !tree && !isLoading && currentConnection?.id) {
      reloadTree();
    }
  }, [currentConnection?.id, tree, isLoading, treeError]);

  const fetchChildren = async (parentId: string): Promise<TreeNodeType[]> => {
    try {
      addLoadedParentId(parentId);

      const nodes = await getChildrenMutation({
        parentId,
        connectionId: currentConnection?.id || 0
      });
      return nodes?.children || [];
    } catch (error) {
      return [];
    }
  };

  return (
    <TreeViewContainerStyled>
      {isLoading && (
        <Box px={1} py={0.5}>
          <LinearProgress sx={{ height: 2 }} /> {/* Thinner progress bar */}
        </Box>
      )}

      <TreeViewContentStyled>
        {tree && <TreeNode node={tree} fetchChildren={fetchChildren} parentRefs={parentRefs} nodeIndex={0} level={0} />}
      </TreeViewContentStyled>
    </TreeViewContainerStyled>
  );
}
