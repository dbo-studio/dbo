import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { JSX } from 'react';
import { QueryPreviewStyled } from './QueryPreview.styled';
export default function QueryPreview(): JSX.Element {
  const getQuery = useTabStore((state) => state.getQuery);
  const isDark = useSettingStore((state) => state.isDark);

  return (
    <QueryPreviewStyled>
      <SyntaxHighlighter value={getQuery()} isDark={isDark ?? false} />
    </QueryPreviewStyled>
  );
}
