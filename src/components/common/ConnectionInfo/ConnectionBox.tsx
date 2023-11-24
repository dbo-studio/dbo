import { Typography } from "@mui/material";
import { ConnectionBoxStyle } from "./ConnectionBox.styled";

export default function ConnectionBox() {
  return (
    <ConnectionBoxStyle>
      <Typography variant="body1" component="h6">
        PostgreSQL 15.1: public: orders: SQL Query
      </Typography>
    </ConnectionBoxStyle>
  );
}
