import { ReactCodeMirrorProps } from '@uiw/react-codemirror';

export interface BaseEditorProps extends ReactCodeMirrorProps {}
export interface CodeEditorProps extends ReactCodeMirrorProps {
  autocomplete: any;
}
