import type { TreeNodeType } from '@/api/tree/types';
import type React from 'react';
import { useCallback } from 'react';

type UseTreeNodeHandlersProps = {
  node: TreeNodeType;
  children: TreeNodeType[];
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  setChildren: (newChildren: TreeNodeType[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsFocused: (focused: boolean) => void;
  fetchChildren: (parentId: string) => Promise<TreeNodeType[]>;
  parentRefs: React.RefObject<Map<string, HTMLDivElement>>;
  nodeRef: React.RefObject<HTMLDivElement>;
  nodeIndex: number;
  level: number;
  onFocusChange?: (id: string) => void;
};

type TreeNodeHandlersType = {
  expandNode: (event: React.MouseEvent | React.KeyboardEvent, moveFocusToChild?: boolean) => Promise<void>;
  focusNode: (event: React.MouseEvent) => void;
  handleBlur: () => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
};

export function useTreeNodeHandlers({
  node,
  children,
  isExpanded,
  setIsExpanded,
  setChildren,
  setIsLoading,
  setIsFocused,
  fetchChildren,
  parentRefs,
  nodeRef,
  nodeIndex,
  level,
  onFocusChange
}: UseTreeNodeHandlersProps): TreeNodeHandlersType {
  const expandNode = useCallback(
    async (event: React.MouseEvent | React.KeyboardEvent, moveFocusToChild = false) => {
      event.stopPropagation();
      if (!node.hasChildren) return;

      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);

      if (newExpanded && children?.length === 0) {
        setIsLoading(true);
        try {
          const newChildren = await fetchChildren(node.id);
          setChildren(newChildren);
          if (moveFocusToChild && newChildren?.length > 0) {
            setTimeout(() => {
              const firstChild = parentRefs.current.get(newChildren[0].id);
              if (firstChild) {
                firstChild.focus();
                onFocusChange?.(newChildren[0].id);
              }
            }, 0);
          }
        } catch (error) {
          console.error('Error fetching children:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (moveFocusToChild && children?.length > 0) {
        const firstChild = parentRefs.current.get(children[0].id);
        if (firstChild) {
          firstChild.focus();
          onFocusChange?.(children[0].id);
        }
      }
    },
    [isExpanded, children, fetchChildren, node.id, parentRefs, onFocusChange, setIsExpanded, setChildren, setIsLoading]
  );

  const focusNode = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setIsFocused(true);
      nodeRef.current?.focus();
      onFocusChange?.(node.id);
    },
    [node.id, nodeRef, onFocusChange, setIsFocused]
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, [setIsFocused]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      event.stopPropagation();
      const nodeRefs = parentRefs.current;

      const focusNodeById = (id: string): void => {
        const target = nodeRefs.get(id);
        if (target) {
          target.focus();
          onFocusChange?.(id);
        }
      };

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          expandNode(event, true).then();
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (node.hasChildren && !isExpanded) expandNode(event, true).then();
          else if (isExpanded && children?.length > 0) focusNodeById(children[0].id);
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (node.hasChildren && isExpanded) setIsExpanded(false);
          else {
            const parent = Array.from(nodeRefs.entries()).find(([, ref]) => ref.dataset.level === String(level - 1));
            if (parent) focusNodeById(parent[0]);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (isExpanded && children?.length > 0) focusNodeById(children[0].id);
          else {
            const nextSiblingId = Array.from(nodeRefs.keys()).find((id) => {
              const ref = nodeRefs.get(id);
              return ref?.dataset.level === String(level) && Number(ref?.dataset.index) === nodeIndex + 1;
            });
            if (nextSiblingId) focusNodeById(nextSiblingId);
          }
          break;

        case 'ArrowUp': {
          event.preventDefault();
          const prevSiblingId = Array.from(nodeRefs.keys()).find((id) => {
            const ref = nodeRefs.get(id);
            return ref?.dataset.level === String(level) && Number(ref?.dataset.index) === nodeIndex - 1;
          });
          if (prevSiblingId) focusNodeById(prevSiblingId);
          else {
            const parent = Array.from(nodeRefs.entries()).find(([, ref]) => ref.dataset.level === String(level - 1));
            if (parent) focusNodeById(parent[0]);
          }
          break;
        }

        default:
          break;
      }
    },
    [node.hasChildren, isExpanded, children, level, nodeIndex, parentRefs, expandNode, onFocusChange, setIsExpanded]
  );

  return {
    expandNode,
    focusNode,
    handleBlur,
    handleKeyDown
  };
}
