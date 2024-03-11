import { ViewUpdate } from '@uiw/react-codemirror';

export type CodeEditorProps = {
  value: string;
  editable?: boolean;
  onChange: (value: string, viewUpdate: ViewUpdate) => void;
};
