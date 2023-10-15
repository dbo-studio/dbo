import { TextField } from "@mui/material";
import { Cell } from "@table-library/react-table-library";

// TODO fix type
export default function CRowCell({ value, type, onChange }: any) {
  return (
    <Cell>
      <TextField
        type={type}
        value={value}
        style={{
          width: "100%",
          border: "none",
          fontSize: "1rem",
          padding: 0,
          margin: 0,
        }}
        onChange={onChange}
      />
    </Cell>
  );
}
