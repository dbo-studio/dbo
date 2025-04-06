import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { JSX } from 'react';
import { QueryPreviewStyled } from './QueryPreview.styled';
export default function QueryPreview(): JSX.Element {
  const selectedTab = useSelectedTab();
  const { getQuery } = useTabStore();
  const { isDark } = useSettingStore();

  if (!selectedTab) {
    return <></>;
  }

  return (
    <QueryPreviewStyled>
      <SyntaxHighlighter value={getQuery(selectedTab)} isDark={isDark ?? false} />
    </QueryPreviewStyled>
  );
}
