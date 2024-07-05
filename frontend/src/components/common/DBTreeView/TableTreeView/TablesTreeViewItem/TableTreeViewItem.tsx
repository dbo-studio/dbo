import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import { MenuType } from '@/components/base/ContextMenu/types';
import { TablesTreeViewItemProps } from '@/components/common/DBTreeView/types';
import { TabMode } from '@/core/enums';
import { useContextMenu, useCopyToClipboard } from '@/hooks';
import useAPI from '@/hooks/useApi.hook.ts';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { Box, Tooltip } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';
import { toast } from 'sonner';

export default function TableTreeViewItem({ table, onClick }: TablesTreeViewItemProps) {
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const [_, copy] = useCopyToClipboard();
  const { addTab } = useTabStore();
  const { currentConnection, updateCurrentConnection } = useConnectionStore();

  const { request: getConnectionDetail } = useAPI({
    apiMethod: api.connection.getConnectionDetail
  });

  const handleAddTabData = () => {
    addTab(table);
  };

  const handleAddTabDesign = () => {
    addTab(table, TabMode.Design);
  };

  const handleRefresh = () => {
    if (!currentConnection) {
      return;
    }
    getConnectionDetail({
      connectionID: currentConnection?.id,
      fromCache: false
    }).then((res) => {
      updateCurrentConnection(res);
    });
  };

  const handleCopy = async () => {
    try {
      await copy(table);
      toast.success(locales.copied);
    } catch (error) {
      console.log('🚀 ~ handleCopy ~ error:', error);
    }
  };

  const menu: MenuType[] = [
    {
      name: locales.open_data,
      action: handleAddTabData
    },
    {
      name: locales.open_design,
      action: handleAddTabDesign
    },
    // {
    //   name: locales.delete_table,
    //   action: () => {}
    // },
    // {
    //   name: locales.delete_table,
    //   action: () => {}
    // },
    // {
    //   name: locales.empty_table,
    //   action: () => {}
    // },
    // {
    //   name: locales.truncate_table,
    //   action: () => {}
    // },
    // {
    //   name: locales.import,
    //   action: () => {}
    // },
    // {
    //   name: locales.export,
    //   action: () => {}
    // },
    {
      name: locales.copy,
      action: handleCopy,
      closeAfterAction: true
    },
    // {
    //   name: locales.rename,
    //   action: () => {}
    // },
    {
      name: locales.refresh,
      action: handleRefresh
    }
  ];

  return (
    <Box onContextMenu={handleContextMenu}>
      <Tooltip title={table}>
        <TreeItem onClick={() => onClick()} itemId={table + '100'} label={table} />
      </Tooltip>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
}
