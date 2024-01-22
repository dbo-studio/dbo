import { sql, StandardSQL } from '@codemirror/lang-sql';
import { Box } from '@mui/material';
import { githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror from '@uiw/react-codemirror';
import { useCallback, useState } from 'react';

export default function TextEditor() {
  const [value, setValue] = useState("SELECT * FROM 'orders';");
  const onChange = useCallback((val: string) => {
    console.log('val:', val);
    setValue(val);
  }, []);

  return (
    <Box>
      <CodeMirror
        value={value}
        role='textbox'
        style={{ fontSize: '14px', fontWeight: 'bold' }}
        height='100px'
        theme={githubLight}
        extensions={[sql({ dialect: StandardSQL })]}
        onChange={onChange}
      />
    </Box>
  );
}
