import MaterialCheckbox from "@mui/material/Checkbox";
import { HeaderCell, TableNode } from "@table-library/react-table-library";
import { Select } from "@table-library/react-table-library/types/select";

interface CSelectProp {
  select: Select<TableNode> | undefined;
}

// TODO fix type
export default function CHeaderSelect({ select }: any) {
  return (
    <HeaderCell resize={{ minWidth: 50, resizerWidth: 50 }}>
      <MaterialCheckbox
        inputProps={{ "aria-label": "select all" }}
        size="small"
        checked={select!.state.all}
        indeterminate={!select!.state.all && !select!.state.none}
        onChange={select!.fns.onToggleAll}
      />
    </HeaderCell>
  );
}
