import { constants } from '@/core/constants';
import { useSettingStore } from '@/store/settingStore/setting.store';

export const openDiagramSourceSidebar = (): void => {
  const sidebar = useSettingStore.getState().ui.sidebar;
  useSettingStore.getState().updateUI({
    sidebar: {
      ...sidebar,
      showRight: true,
      rightSidebarTab: 1,
      rightWidth: sidebar.rightWidth || constants.defaultSidebarWidth
    }
  });
};
