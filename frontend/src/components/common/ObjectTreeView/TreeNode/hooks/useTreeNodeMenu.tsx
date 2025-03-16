import type { TreeNodeType } from '@/api/tree/types';
import type { MenuType } from '@/components/base/ContextMenu/types';

export function useTreeNodeMenu(node: TreeNodeType, actionDetection: (event: any, node: TreeNodeType) => void) {
  const menu: MenuType[] =
    node?.contextMenu?.map((action) => ({
      name: action.title,
      action: () =>
        actionDetection({ stopPropagation: () => {} } as any, {
          ...node,
          action
        }),
      closeAfterAction: true
    })) || [];

  return { menu };
}
