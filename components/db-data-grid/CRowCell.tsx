import { ClickAwayListener, InputBase, Typography } from "@mui/material";
import { Cell } from "@table-library/react-table-library";
import { useState } from "react";

// TODO fix type
export default function CRowCell({ value, type, id, select, onChange }: any) {
  const [showInput, setShowInput] = useState(false);

  if (type == "date") {
    value = value.toISOString().substr(0, 10);
  }

  const onClickHandler = (e: any) => {
    if (e.detail == 2) {
      setShowInput(true);
    } else if (!showInput) {
      select.fns.onToggleByIdExclusively(id);
    }
  };

  return (
    <Cell onClick={onClickHandler}>
      {showInput ? (
        <ClickAwayListener onClickAway={() => setShowInput(false)}>
          <InputBase type={type} value={value} onChange={onChange} />
        </ClickAwayListener>
      ) : (
        <Typography variant="body1">{value}</Typography>
      )}
    </Cell>
  );
}
