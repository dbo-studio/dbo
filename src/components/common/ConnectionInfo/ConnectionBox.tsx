import { Typography } from "@mui/material";
import { ConnectionBoxStyled } from "./ConnectionBox.styled";

export default function ConnectionBox() {
  return (
    <ConnectionBoxStyled>
      <Typography variant="body1" component="h6">
        PostgreSQL 15.1: public: orders: SQL Query
      </Typography>
    </ConnectionBoxStyled>
  );
}
