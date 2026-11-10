import type { CodeEditorProps } from '@/components/base/CodeEditor/types';
import { type JSX, lazy, Suspense } from 'react';

// Monaco is only needed when a cell actually renders an editor.
const MonacoEditor = lazy(() => import('@/components/base/CodeEditor/CodeEditor'));

export default function LazyCodeEditor(props: CodeEditorProps): JSX.Element {
  return (
    <Suspense fallback={null}>
      <MonacoEditor {...props} />
    </Suspense>
  );
}
