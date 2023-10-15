import MaterialCheckbox from "@mui/material/Checkbox";
import { Cell } from "@table-library/react-table-library";

// TODO fix type
export default function CRowSelect({ select, id }: any) {
  return (
    <Cell stiff>
      <MaterialCheckbox
        inputProps={{ "aria-label": "select item" }}
        size="small"
        checked={select.state.ids.includes(id)}
        onChange={() => select.fns.onToggleById(id)}
      />
    </Cell>
  );
}
