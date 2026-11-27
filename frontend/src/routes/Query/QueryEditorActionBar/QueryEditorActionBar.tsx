import { type JSX, useEffect, useRef, useState } from 'react';
import type { QueryEditorActionBarProps } from '../types';
import {
  QueryEditorActionBarActionsBoxStyled,
  QueryEditorActionBarBoxStyled,
  QueryEditorActionBarStackStyled
} from './QueryEditorActionBar.styled';
import QueryEditorActions from './QueryEditorActions/QueryEditorActions';
import QueryEditorLeading from './QueryEditorLeading/QueryEditorLeading';

// Room needed for both selects, the AI switch and the full icon row on one line.
const COLLAPSE_BELOW_PX = 760;

export default function QueryEditorActionBar({
  databases,
  schemas,
  onFormat,
  onRunQuery,
  onAiExplain,
  loading,
  formatQuery,
  onExport,
  onStop
}: QueryEditorActionBarProps): JSX.Element {
  const barRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Measures the bar itself (not the viewport) so a narrow editor panel collapses too.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setCollapsed(entry.contentRect.width < COLLAPSE_BELOW_PX));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <QueryEditorActionBarStackStyled ref={barRef}>
      <QueryEditorActionBarBoxStyled>
        <QueryEditorLeading databases={databases} schemas={schemas} />
      </QueryEditorActionBarBoxStyled>
      <QueryEditorActionBarActionsBoxStyled>
        <QueryEditorActions
          collapsed={collapsed}
          loading={loading}
          onFormat={onFormat}
          onRunQuery={onRunQuery}
          onAiExplain={onAiExplain}
          formatQuery={formatQuery}
          onExport={onExport}
          onStop={onStop}
        />
      </QueryEditorActionBarActionsBoxStyled>
    </QueryEditorActionBarStackStyled>
  );
}
