import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useEffect } from 'react';

export const useResponsiveSidebar = (): void => {
  const { useSidebarOverlay } = useLayoutMode();
  const updateUI = useSettingStore((state) => state.updateUI);

  useEffect(() => {
    if (!useSidebarOverlay) {
      return;
    }

    const sidebar = useSettingStore.getState().ui.sidebar;
    if (sidebar.showLeft && sidebar.showRight) {
      updateUI({ sidebar: { ...sidebar, showRight: false } });
    }
  }, [useSidebarOverlay, updateUI]);
};
