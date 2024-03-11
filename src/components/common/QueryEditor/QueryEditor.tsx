import { Box } from '@mui/material';
import { useState } from 'react';
import CodeEditor from '../../base/CodeEditor/CodeEditor';

export default function QueryEditor() {
  const [query, setQuery] = useState('query');

  return (
    <Box height={200} bgcolor={'red'}>
      <CodeEditor value={query} onChange={setQuery} editable={true} />
    </Box>
  );
}
