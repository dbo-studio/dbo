import { useSettingStore } from '@/store/settingStore/setting.store';
import { RefObject, useCallback, useEffect, useRef } from 'react';

export const useHandleScroll = (tableRef: RefObject<HTMLDivElement>): void => {
  const scrollToBottom = useSettingStore((state) => state.editor.scrollToBottom);
  const updateEditor = useSettingStore((state) => state.updateEditor);
  const prevScrollToBottomRef = useRef(false);
  const isInitialMountRef = useRef(true);

  const handleScrollToBottom = useCallback(() => {
    if (tableRef.current) {
      tableRef.current.scrollTo({
        top: tableRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    updateEditor({ scrollToBottom: false });
  }, [tableRef, updateEditor]);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevScrollToBottomRef.current = scrollToBottom;
      return;
    }

    if (scrollToBottom && !prevScrollToBottomRef.current) {
      handleScrollToBottom();
    }

    prevScrollToBottomRef.current = scrollToBottom;
  }, [scrollToBottom, handleScrollToBottom]);
};
