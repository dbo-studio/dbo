import { shikiToMonaco } from '@shikijs/monaco';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { createHighlighter } from 'shiki';

/** define MonacoEnvironment.getWorker  */
(globalThis as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url));
    }
    return new EditorWorker();
  }
};

const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['sql']
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
shikiToMonaco(highlighter, monaco);
