import { Box, styled } from '@mui/material';

type CodeEditorBoxStyledProps = {
  width?: string | number;
  height?: string | number;
};

export const CodeEditorBoxStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'width' && prop !== 'height'
})<CodeEditorBoxStyledProps>(({ width, height }) => ({
  width: width || '100%',
  height: height || '100%',
  '& .monaco-editor, .monaco-editor .margin': {
    userSelect: 'text',
    WebkitUserSelect: 'text',
    MsUserSelect: 'text'
  }
}));
