import { useTreeStore } from '@/store/treeStore/tree.store';
import { useEffect, useRef, useState } from 'react';

const getIsNodeExpanded = (connectionId: number | undefined, nodeId: string): boolean => {
  if (!connectionId) {
    return false;
  }

  return useTreeStore.getState().expandedNodes[connectionId]?.includes(nodeId) ?? false;
};

export const useIsTreeNodeExpanded = (nodeId: string, connectionId?: number): boolean => {
  const [isExpanded, setIsExpanded] = useState(() => getIsNodeExpanded(connectionId, nodeId));
  const isExpandedRef = useRef(isExpanded);

  useEffect(() => {
    isExpandedRef.current = getIsNodeExpanded(connectionId, nodeId);
    setIsExpanded(isExpandedRef.current);
  }, [connectionId, nodeId]);

  useEffect(() => {
    if (!connectionId) {
      return;
    }

    return useTreeStore.subscribe((state) => {
      const nextExpanded = state.expandedNodes[connectionId]?.includes(nodeId) ?? false;

      if (nextExpanded !== isExpandedRef.current) {
        isExpandedRef.current = nextExpanded;
        setIsExpanded(nextExpanded);
      }
    });
  }, [connectionId, nodeId]);

  return isExpanded;
};
