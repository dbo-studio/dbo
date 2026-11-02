import type { MenuType } from '@/components/base/ContextMenu/types';
import { diagramScopeFromTreeNode } from '@/core/diagram/scopeFromTree';
import { useAiBridge } from '@/hooks/useAiBridge';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import locales from '@/locales';
import { openBackup } from '@/core/backup/openBackup';
import { useTransferStore } from '@/store/transfer/transfer.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { TreeNodeType } from '@/types/Tree';

function tableAiMenu(tableName: string, prefillChat: ReturnType<typeof useAiBridge>['prefillChat']): MenuType {
  const run = (message: string): void => {
    prefillChat(message, true, {
      tables: [tableName],
      input: message
    });
  };

  return {
    name: locales.ai_menu,
    children: [
      {
        name: locales.ai_generate_select,
        action: () => run(`Generate a SELECT query for ${tableName}.`),
        closeAfterAction: true
      },
      {
        name: locales.ai_generate_update,
        action: () => run(`Generate an UPDATE query for ${tableName}.`),
        closeAfterAction: true
      },
      {
        name: locales.ai_generate_delete,
        action: () => run(`Generate a DELETE query for ${tableName}.`),
        closeAfterAction: true
      },
      {
        name: locales.ai_generate_insert,
        action: () => run(`Generate an INSERT query for ${tableName}.`),
        closeAfterAction: true
      },
      {
        name: locales.ai_ask,
        action: () => run(`Tell me about the ${tableName} table.`),
        closeAfterAction: true
      }
    ]
  };
}

/** Builds a node's context menu on demand, so one hook instance serves every row of the tree. */
export function useTreeNodeMenuBuilder(
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => Promise<void>
): (node: TreeNodeType) => MenuType[] {
  const { prefillChat } = useAiBridge();
  const currentConnection = useCurrentConnection();
  const addDiagramTab = useTabStore((state) => state.addDiagramTab);
  const openExport = useTransferStore((state) => state.openExport);
  const openImport = useTransferStore((state) => state.openImport);

  return (node: TreeNodeType): MenuType[] => {
    const menu: MenuType[] =
      node?.contextMenu?.map((action) => ({
        name: action.title,
        action: (): Promise<void> =>
          actionDetection({ stopPropagation: () => {} } as React.MouseEvent, {
            ...node,
            action
          }),
        closeAfterAction: true
      })) || [];

    const scope = diagramScopeFromTreeNode(node, currentConnection?.type);
    if (scope) {
      menu.push({
        name: locales.open_diagram,
        action: () => {
          addDiagramTab(scope);
        },
        closeAfterAction: true
      });
    }

    // Whole-object transfer: a table's rows, a schema's tables or a database. The grid's own
    // Export button only exports the rows it shows.
    if (scope && currentConnection && (node.type === 'table' || node.type === 'schema' || node.type === 'database')) {
      menu.push({
        name: locales.export,
        action: () =>
          openExport(currentConnection.id, {
            kind: node.type as 'table' | 'schema' | 'database',
            database: scope.database,
            schema: scope.schema,
            table: scope.focusTable
          }),
        closeAfterAction: true
      });
    }

    if (node.type === 'table' && scope?.focusTable && currentConnection) {
      menu.push({
        name: locales.import,
        action: () => openImport(currentConnection.id, scope.focusTable as string),
        closeAfterAction: true
      });
    }

    if (node.type === 'database' && currentConnection && currentConnection.type !== 'sqlite') {
      menu.push({
        name: locales.backup_restore,
        action: () => openBackup({ connectionId: currentConnection.id, database: node.name }),
        closeAfterAction: true
      });
    }

    if (node.type === 'table') {
      menu.push(tableAiMenu(node.name, prefillChat));
    }

    return menu;
  };
}

export function useTreeNodeMenu(
  node: TreeNodeType,
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => Promise<void>
): {
  menu: MenuType[];
} {
  const buildMenu = useTreeNodeMenuBuilder(actionDetection);
  return { menu: buildMenu(node) };
}
