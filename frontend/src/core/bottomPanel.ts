import { useSettingStore } from '@/store/settingStore/setting.store';
import type { BottomPanelType } from '@/store/settingStore/types';

/** Opens the bottom panel on a tab (or toggles it when no tab is given). */
export function openBottomPanel(tab?: BottomPanelType['tab']): void {
  const { ui, updateUI } = useSettingStore.getState();
  const panel = ui.bottomPanel;

  updateUI({
    bottomPanel: tab ? { ...panel, open: true, tab } : { ...panel, open: !panel.open }
  });
}

export function closeBottomPanel(): void {
  const { ui, updateUI } = useSettingStore.getState();
  updateUI({ bottomPanel: { ...ui.bottomPanel, open: false } });
}
