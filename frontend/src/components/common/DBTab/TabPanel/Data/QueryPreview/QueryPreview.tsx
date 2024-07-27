import { SyntaxHighlighter } from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useEffect, useState } from 'react';
import { QueryPreviewStyled } from './QueryPreview.styled';

export default function QueryPreview() {
  const { selectedTab } = useTabStore();
  const [html, setHtml] = useState('');

  useEffect(() => {
    SyntaxHighlighter(selectedTab?.query ?? '').then((_html) => setHtml(_html));
  }, [selectedTab?.query]);

  return (
    <QueryPreviewStyled>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </QueryPreviewStyled>
  );
}
