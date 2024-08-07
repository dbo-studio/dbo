import { SyntaxHighlighter } from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useEffect, useState } from 'react';
import { QueryPreviewStyled } from './QueryPreview.styled';

export default function QueryPreview() {
  const { getQuery } = useTabStore();
  const { isDark } = useSettingStore();
  const [html, setHtml] = useState('');

  useEffect(() => {
    SyntaxHighlighter(getQuery() ?? '', isDark ?? false).then((_html) => setHtml(_html));
  }, [getQuery()]);

  return (
    <QueryPreviewStyled>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </QueryPreviewStyled>
  );
}
