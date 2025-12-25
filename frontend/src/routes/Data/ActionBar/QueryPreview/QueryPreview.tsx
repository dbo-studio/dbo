import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { JSX } from 'react';
import { QueryPreviewStyled } from './QueryPreview.styled';
export default function QueryPreview(): JSX.Element {
  const getQuery = useTabStore((state) => state.getQuery);

  return (
    <QueryPreviewStyled>
      <SyntaxHighlighter value={getQuery()} />
    </QueryPreviewStyled>
  );
}
