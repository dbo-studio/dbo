import type { MenuType } from '@/components/base/ContextMenu/types';
import { isNoSQLType } from '@/core/db/connectionAliases';
import { diagramScopeFromTreeNode } from '@/core/diagram/scopeFromTree';
import { useAiBridge } from '@/hooks/useAiBridge';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useFeaturePermissions } from '@/hooks/useFeaturePermissions';
import locales from '@/locales';
import { openBackup } from '@/core/backup/openBackup';
import { useTransferStore } from '@/store/transfer/transfer.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useActionDetection } from './useActionDetection';
import { TreeNodeActionType, TreeNodeType } from '@/types/Tree';

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

const isDrop = (action: TreeNodeActionType): boolean => action.name.startsWith('drop');
const isUtility = (action: TreeNodeActionType): boolean => action.name === 'copyName' || action.name === 'refresh';

/** Joins non-empty groups with a separator, like the data grid menu. */
const grouped = (...groups: MenuType[][]): MenuType[] =>
  groups
    .filter((group) => group.length > 0)
    .flatMap((group, index) => (index === 0 ? group : [{ name: `separator-${index}`, separator: true }, ...group]));

export type TreeMenuHandlers = {
  onRename: (node: TreeNodeType) => void;
  onDropMany: (nodes: TreeNodeType[]) => void;
};

/** Builds a node's context menu on demand, so one hook instance serves every row of the tree. */
export function useTreeNodeMenuBuilder(
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => Promise<void>,
  { onRename, onDropMany }: TreeMenuHandlers
): (node: TreeNodeType, selection: TreeNodeType[]) => MenuType[] {
  const { prefillChat } = useAiBridge();
  const currentConnection = useCurrentConnection();
  const addDiagramTab = useTabStore((state) => state.addDiagramTab);
  const perms = useFeaturePermissions();
  // Redis has no row import/export or backup; the SQL job path cannot run on it.
  const isNoSQL = isNoSQLType(currentConnection?.type);
  const openExport = useTransferStore((state) => state.openExport);
  const openImport = useTransferStore((state) => state.openImport);

  const run = (node: TreeNodeType, action: TreeNodeActionType): MenuType => ({
    name: action.title,
    action: (): void => {
      void actionDetection({ stopPropagation: () => {} } as React.MouseEvent, { ...node, action });
    },
    closeAfterAction: true
  });

  const pinItem = (nodes: TreeNodeType[], pinned: boolean): MenuType => ({
    name: pinned ? locales.tree_unpin : locales.tree_pin,
    action: () => {
      const { pinNodes, unpinNodes } = useTreeStore.getState();
      if (pinned) unpinNodes(nodes.map((n) => n.id));
      else pinNodes(nodes);
    },
    closeAfterAction: true
  });

  const isPinned = (node: TreeNodeType): boolean =>
    Boolean(
      currentConnection &&
      useTreeStore.getState().pinnedNodes[currentConnection.id]?.some((pinned) => pinned.id === node.id)
    );

  const multiMenu = (nodes: TreeNodeType[]): MenuType[] => {
    const scopes = nodes.map((node) => diagramScopeFromTreeNode(node, currentConnection?.type));
    const first = scopes[0];
    // Diagram and export take several tables of one database/schema.
    const sameTables =
      nodes.every((node) => node.type === 'table') &&
      scopes.every((scope) => scope && scope.database === first?.database && scope.schema === first?.schema);
    const tables = scopes.flatMap((scope) => scope?.focusTables ?? []);
    const allPinned = nodes.every(isPinned);
    const dropNodes = nodes.filter((node) => node.contextMenu?.some(isDrop));

    const view: MenuType[] = [];
    const data: MenuType[] = [];
    if (sameTables && first && currentConnection) {
      view.push({
        name: locales.tree_diagram_selected,
        action: () => addDiagramTab({ database: first.database, schema: first.schema, focusTables: tables }),
        closeAfterAction: true
      });
      if (perms.export && !isNoSQL) {
        data.push({
          name: locales.tree_export_selected.replace('{n}', String(tables.length)),
          action: () =>
            openExport(currentConnection.id, {
              kind: 'table',
              database: first.database,
              schema: first.schema,
              tables
            }),
          closeAfterAction: true
        });
      }
    }

    return grouped(
      view,
      data,
      [pinItem(nodes, allPinned)],
      dropNodes.length === nodes.length
        ? [
            {
              name: locales.tree_drop_selected.replace('{n}', String(nodes.length)),
              action: () => onDropMany(nodes),
              destructive: true,
              closeAfterAction: true
            }
          ]
        : []
    );
  };

  return (node: TreeNodeType, selection: TreeNodeType[]): MenuType[] => {
    if (selection.length > 1 && selection.some((n) => n.id === node.id)) return multiMenu(selection);

    const actions = node?.contextMenu ?? [];
    const open: MenuType[] = actions
      .filter((a) => !isDrop(a) && !isUtility(a) && a.name !== 'rename')
      .map((a) => run(node, a));
    if (actions.some((a) => a.name === 'rename')) {
      open.push({ name: locales.rename, action: () => onRename(node), closeAfterAction: true });
    }

    const scope = diagramScopeFromTreeNode(node, currentConnection?.type);
    const view: MenuType[] = scope
      ? [{ name: locales.open_diagram, action: () => addDiagramTab(scope), closeAfterAction: true }]
      : [];

    // Whole-object transfer: a table's rows, a schema's tables or a database. The grid's own
    // Export button only exports the rows it shows.
    const data: MenuType[] = [];
    if (
      perms.export &&
      !isNoSQL &&
      scope &&
      currentConnection &&
      (node.type === 'table' || node.type === 'schema' || node.type === 'database')
    ) {
      data.push({
        name: locales.export,
        action: () =>
          openExport(currentConnection.id, {
            kind: node.type as 'table' | 'schema' | 'database',
            database: scope.database,
            schema: scope.schema,
            table: scope.focusTables?.[0]
          }),
        closeAfterAction: true
      });
    }

    if (perms.import && !isNoSQL && node.type === 'table' && scope?.focusTables?.[0] && currentConnection) {
      data.push({
        name: locales.import,
        action: () => openImport(currentConnection.id, scope.focusTables?.[0] as string),
        closeAfterAction: true
      });
    }

    if (node.type === 'database' && currentConnection && currentConnection.type !== 'sqlite' && !isNoSQL) {
      data.push({
        name: locales.backup_restore,
        action: () => openBackup({ connectionId: currentConnection.id, database: node.name }),
        closeAfterAction: true
      });
    }

    const ai: MenuType[] = node.type === 'table' ? [tableAiMenu(node.name, prefillChat)] : [];

    const utility: MenuType[] = [
      pinItem([node], isPinned(node)),
      ...actions.filter(isUtility).map((a) => run(node, a))
    ];

    const danger: MenuType[] = actions.filter(isDrop).map((a) => ({ ...run(node, a), destructive: true }));

    return grouped(open, view, data, ai, utility, danger);
  };
}

const noExpand = async (): Promise<void> => {};

/** Mobile action sheet: same menu, with a native prompt standing in for the inline rename editor. */
export function useTreeNodeMenu(
  node: TreeNodeType,
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => Promise<void>
): {
  menu: MenuType[];
} {
  const { renameNode, dropNodes } = useActionDetection(noExpand);
  const buildMenu = useTreeNodeMenuBuilder(actionDetection, {
    onRename: (target) => {
      const name = window.prompt(locales.rename, target.name)?.trim();
      if (name && name !== target.name) void renameNode(target, name);
    },
    onDropMany: dropNodes
  });
  return { menu: buildMenu(node, [node]) };
}
