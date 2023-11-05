import { Box } from "@mui/material";
import { useState } from "react";
import CodeEditor from "../ui/code-editor";

export default function QueryPreview() {
  const [value, setValue] = useState("SELECT * FROM 'orders';");

  return (
    <Box>
      <CodeEditor value={value} editable={false} />
    </Box>
  );
}
