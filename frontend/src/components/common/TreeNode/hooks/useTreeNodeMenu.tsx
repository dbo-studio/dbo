import type { TreeNodeType } from '@/api/tree/types';
import type { MenuType } from '@/components/base/ContextMenu/types';

export function useTreeNodeMenu(node: TreeNodeType, actionDetection: (event: any, node: TreeNodeType) => void) {
  const menu: MenuType[] =
    node?.contextMenu?.map((action) => ({
      name: action.title,
      action: () => {
        switch (action.type) {
          case 'route': {
            actionDetection({ stopPropagation: () => {} } as any, {
              ...node,
              action
            });
            break;
          }
          default:
            break;
        }
      },
      closeAfterAction: true
    })) || [];

  return { menu };
}
