import { useSettingStore } from '@/store/settingStore/setting.store';
import { useCallback, useEffect } from 'react';

export const useHandleScroll = (tableRef: any): void => {
  const scrollToBottom = useSettingStore((state) => state.scrollToBottom);
  const toggleScrollToBottom = useSettingStore((state) => state.toggleScrollToBottom);

  const handleScrollToBottom = useCallback(() => {
    if (tableRef.current) {
      tableRef.current.scrollTo({
        top: tableRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    toggleScrollToBottom(false);
  }, [tableRef]);

  useEffect(() => {
    if (scrollToBottom) {
      handleScrollToBottom();
    }
  }, [scrollToBottom]);
};
