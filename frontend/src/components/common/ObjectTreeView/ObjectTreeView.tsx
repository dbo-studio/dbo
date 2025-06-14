import api from '@/api';
import type { TreeNodeType } from '@/api/tree/types';
import Search from '@/components/base/Search/Search';
import { useCurrentConnection } from '@/hooks';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Box, LinearProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';
import { TreeViewContainerStyled, TreeViewContentStyled } from './ObjectTreeView.styled';
import TreeNode from './TreeNode/TreeNode';

export default function ObjectTreeView(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const { getTree, isLoading, treeError, reloadTree, addLoadedParentId, toggleIsLoading } = useTreeStore();
  const parentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

  const tree = useMemo(() => getTree(), [getTree(), currentConnection?.id]);

  const { mutateAsync: getChildrenMutation } = useMutation({
    mutationFn: api.tree.getTree,
    onError: (error): void => {
      console.error('🚀 ~ getChildrenMutation ~ error:', error);
    }
  });

  useEffect(() => {
    if (!treeError && !tree && !isLoading && currentConnection?.id) {
      reloadTree();
    } else if (isLoading) {
      toggleIsLoading(false);
    }
  }, [currentConnection?.id, tree, treeError]);

  useEffect(() => {
    reloadTree();
  }, [currentConnection?.id]);

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
      <Box mt={1}>
        <Search onChange={(value: string): void => setSearchTerm(value)} />
      </Box>

      {isLoading && (
        <Box px={1} py={0.5}>
          <LinearProgress sx={{ height: 2 }} />
        </Box>
      )}

      <TreeViewContentStyled>
        {tree && (
          <TreeNode
            node={tree}
            fetchChildren={fetchChildren}
            parentRefs={parentRefs}
            nodeIndex={0}
            level={0}
            searchTerm={searchTerm}
          />
        )}
      </TreeViewContentStyled>
    </TreeViewContainerStyled>
  );
}
