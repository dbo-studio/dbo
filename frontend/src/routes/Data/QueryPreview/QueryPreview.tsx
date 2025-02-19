import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { QueryPreviewStyled } from './QueryPreview.styled';

export default function QueryPreview() {
  const { getQuery } = useTabStore();
  const { isDark } = useSettingStore();

  return (
    <QueryPreviewStyled>
      <SyntaxHighlighter value={getQuery() ?? ''} isDark={isDark ?? false} />
    </QueryPreviewStyled>
  );
}
