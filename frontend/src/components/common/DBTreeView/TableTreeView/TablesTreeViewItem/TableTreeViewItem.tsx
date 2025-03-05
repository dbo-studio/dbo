import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import type { TablesTreeViewItemProps } from '@/components/common/DBTreeView/types';
import { TabMode } from '@/core/enums';
import { useContextMenu, useCopyToClipboard } from '@/hooks';
import useAPI from '@/hooks/useApi.hook.ts';
import useNavigate from '@/hooks/useNavigate.hook';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { Box, Tooltip } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';
import axios from 'axios';
import { toast } from 'sonner';

export default function TableTreeViewItem({ table, onClick }: TablesTreeViewItemProps) {
  const navigate = useNavigate();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const [copy] = useCopyToClipboard();
  const { addTab } = useTabStore();
  const { updateCurrentConnection, currentConnection, updateLoading } = useConnectionStore();

  const { request: getConnectionDetail } = useAPI({
    apiMethod: api.connection.getConnectionDetail
  });

  const handleAddTabData = () => {
    const tab = addTab(table);
    navigate({
      route: 'data',
      tabId: tab.id
    });
  };

  const handleAddTabDesign = () => {
    const tab = addTab(table, undefined, TabMode.Design);
    navigate({
      route: 'design',
      tabId: tab.id
    });
  };

  const handleRefresh = () => {
    if (!currentConnection) {
      return;
    }
    updateLoading('loading');
    getConnectionDetail({
      connectionID: currentConnection?.id,
      fromCache: false
    })
      .then((res) => {
        updateCurrentConnection(res);
        updateLoading('finished');
      })
      .catch((e) => {
        updateLoading('error');
        if (axios.isAxiosError(e)) {
          toast.error(e.message);
        }
        console.log('🚀 ~ handleRefresh ~ err:', e);
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
        <TreeItem onClick={() => onClick()} itemId={`${table}100`} label={table} />
      </Tooltip>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
}
