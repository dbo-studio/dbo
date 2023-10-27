import { Box } from "@mui/material";
import { useState } from "react";

export default function QueryPreview() {
  const [value, setValue] = useState("SELECT * FROM 'orders';");

  return (
    <Box>
      <CodeEditor value={value} editable={false} />
    </Box>
  );
}
