const connectionBoxStyle = {
  background: "#E6F9F7",
  height: "32px",
  textAlign: "center",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
  border: "1px solid #C0E3D9",
};

import { Box, Typography } from "@mui/material";

export default function ConnectionBox() {
  return (
    <Box sx={connectionBoxStyle}>
      <Typography variant="body1" component="h6">
        PostgreSQL 15.1: public: orders: SQL Query
      </Typography>
    </Box>
  );
}
